param(
    [string] $Profile = 'web',
    [string] $DshCommand = 'dsh',
    [string] $DshRoot = '',
    [string] $DshHome = ''
)

$bundleRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$filesSpec = (Get-Content -Raw (Join-Path $bundleRoot 'dsh-files.pinned.json') | ConvertFrom-Json).spec
if ($DshRoot -ne '') {
    $cli = Join-Path (Resolve-Path $DshRoot).Path 'apps\cli\lib\bin.js'
    if (-not (Test-Path -LiteralPath $cli)) {
        throw "找不到构建后的 DSH CLI：$cli"
    }
}

$homePath = if ($DshHome -ne '') { $DshHome }
    elseif ($env:DSH_HOME) { $env:DSH_HOME }
    else { Join-Path $HOME '.dsh' }
$profileDir = [System.IO.Path]::GetFullPath((Join-Path $homePath "profiles\$Profile"))

function Invoke-DshPlugin {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]] $Arguments)
    if ($DshRoot -ne '') {
        & node $cli plugin @Arguments
    } else {
        & $DshCommand plugin @Arguments
    }
}

# The DSH host supplies these peer packages. Do not ask pnpm to fetch pre-release
# host packages from the public registry while resolving this product bundle.
Invoke-DshPlugin --profile $Profile config set auto-install-peers false --location project
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
Invoke-DshPlugin --profile $Profile add $filesSpec
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

# 依赖声明必须让包体的**真实路径**落在 profile 目录内。DSH 的 profile 解析只为位于
# profile 目录内的模块转发裸包名（app-boot 的 profile-resolution：父模块 URL 不在
# profile 前缀下就直接交回 Node 原生解析）。本 bundle import '@deepseek-ai/schemastery'、
# '@deepseek-ai/dsh-tools' 时无人转发，直接 MODULE_NOT_FOUND；loader 在 import 阶段
# 就放弃，这一行永远不建 fiber，表现为 preset 挂载失败里的 "never started"，后果是
# 新建会话直接报错。
#
# 指向本目录的 link: 或 file: 都会留下 junction，真实路径解析到 profile 之外，所以
# 先把包体镜像到 profile 内的 vendor\ 下，再 link 这个镜像：真实路径因此留在 profile
# 内，且之后任何 pnpm 操作（dsh plugin add <包>）重新链接都仍然成立。
$stage = Join-Path $profileDir 'vendor\dsh-runtime-bundle'
New-Item -ItemType Directory -Path $stage -Force | Out-Null
robocopy $bundleRoot $stage /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) {
    throw "镜像包体失败：robocopy $bundleRoot -> $stage 返回 $LASTEXITCODE"
}
Invoke-DshPlugin --profile $Profile add "link:$stage"
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

# pnpm 的具体形态不是本脚本能约定的：装完再验一次，落在 profile 外就换成实体副本。
$installed = Join-Path $profileDir 'node_modules\@qihao\dsh-runtime-bundle'
if (-not (Test-Path -LiteralPath $installed)) {
    throw "安装后仍找不到 $installed"
}

$item = Get-Item -LiteralPath $installed -Force
$resolved = $item.FullName
# ResolveLinkTarget 返回最终目标，$null 表示这不是链接；Target 属性在单目标时是字符串，
# 按下标取会拿到第一个字符，不能用。
$linkTarget = $item.ResolveLinkTarget($true)
if ($null -ne $linkTarget) {
    $resolved = $linkTarget.FullName
}

if (-not $resolved.StartsWith($profileDir, [System.StringComparison]::OrdinalIgnoreCase)) {
    Write-Host "包体落在 profile 之外，替换为实体副本：$resolved"
    cmd /c rmdir "$installed"
    Copy-Item -LiteralPath $bundleRoot -Destination $installed -Recurse -Force
}
