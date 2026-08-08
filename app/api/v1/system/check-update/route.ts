import { NextResponse } from 'next/server'
import packageJson from '@/package.json'

const GITHUB_REPO_OWNER = 'Tranphuong0512'
const GITHUB_REPO_NAME = 'MANAGERPROJECT'
const CURRENT_VERSION = packageJson.version || '3.4.0'

function compareVersions(v1: string, v2: string): number {
  const cleanV1 = v1.replace(/^v/i, '').trim().split('.').map(Number)
  const cleanV2 = v2.replace(/^v/i, '').trim().split('.').map(Number)

  for (let i = 0; i < Math.max(cleanV1.length, cleanV2.length); i++) {
    const val1 = cleanV1[i] || 0
    const val2 = cleanV2[i] || 0
    if (val1 > val2) return 1
    if (val1 < val2) return -1
  }
  return 0
}

export async function GET() {
  try {
    const githubApiUrl = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`
    
    const res = await fetch(githubApiUrl, {
      headers: {
        'User-Agent': 'MANAGERPROJECT-AutoUpdater',
        'Accept': 'application/vnd.github.v3+json'
      },
      cache: 'no-store'
    })

    let latestTag = ''
    let releaseNotes = ''
    let releaseName = ''
    let publishedAt = ''
    let assets: any[] = []

    if (res.ok) {
      const data = await res.json()
      latestTag = data.tag_name || data.name || ''
      releaseName = data.name || data.tag_name || ''
      releaseNotes = data.body || 'Phiên bản mới phát hành trên GitHub'
      publishedAt = data.published_at || ''
      assets = data.assets || []
    } else {
      // Fallback to tags if no official release yet
      const tagsRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/tags`, {
        headers: { 'User-Agent': 'MANAGERPROJECT-AutoUpdater' },
        cache: 'no-store'
      })
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json()
        if (Array.isArray(tagsData) && tagsData.length > 0) {
          latestTag = tagsData[0].name || ''
          releaseName = `Phiên bản ${latestTag}`
          releaseNotes = `Phát hành mới tag ${latestTag} trên GitHub`
        }
      }
    }

    if (!latestTag) {
      return NextResponse.json({
        update_available: false,
        current_version: CURRENT_VERSION,
        latest_version: CURRENT_VERSION,
        message: 'Không tìm thấy thông tin phiên bản mới trên GitHub.'
      })
    }

    const isNewer = compareVersions(latestTag, CURRENT_VERSION) > 0

    // Find Windows setup exe asset if uploaded to release
    const exeAsset = assets.find((a: any) => a.name && a.name.endsWith('.exe'))
    const exeDownloadUrl = exeAsset
      ? exeAsset.browser_download_url
      : `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/download/${latestTag}/NIX.AI.PROJECT.MANAGER.Setup.exe`

    return NextResponse.json({
      update_available: isNewer,
      current_version: CURRENT_VERSION,
      latest_version: latestTag.replace(/^v/i, ''),
      release_tag: latestTag,
      release_name: releaseName,
      release_notes: releaseNotes,
      published_at: publishedAt,
      download_url: `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/latest`,
      exe_download_url: exeDownloadUrl,
      repo_url: `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`
    })
  } catch (err: any) {
    console.error('Check update error:', err)
    return NextResponse.json({
      update_available: false,
      current_version: CURRENT_VERSION,
      error: err.message
    }, { status: 500 })
  }
}
