// noinspection JSCheckFunctionSignatures,JSUnresolvedFunction

import AdmZip from 'adm-zip'
import path from 'path'
import fs from 'fs'

import gitRemoteOriginUrl from 'remote-origin-url'
import parseGithubUrl from 'parse-github-url'
import gitBranch from 'git-branch'
import gitLog from 'gitlog'

const patchPath = process.argv[2]

async function run() {
    if (patchPath == null) console.log('Please provide a path.')
    else {
        const list = []
        const files = fs.readdirSync(patchPath).filter(file => file.endsWith('.zip'))

        for (const patch of files) {
            const zip = new AdmZip(path.join(patchPath, patch))
            const metaFile = zip.getEntry('patch.meta')
            const gitUrl = parseGithubUrl(gitRemoteOriginUrl.sync())
            gitUrl.branch = gitBranch.sync()
            const meta = {
                url: `https://github.com/${gitUrl.repo}/raw/${gitUrl.branch}/${patchPath}/${patch}`,
                author: 'Rboard Theme Patcher',
                tags: []
            }
            meta.size = fs.statSync(path.join(patchPath, patch)).size
            await new Promise((res) => {
                gitLog.default({
                    repo: process.cwd(),
                    file: path.join(patchPath, patch),
                    fields: ["hash", "authorName", "authorDate"]
                }, (error, commits) => {
                    const commit = commits[0]
                    if (commit) {
                        meta.date = new Date(commit.authorDate).getTime()
                        meta.author = commit.authorName
                    }
                    res()
                })
            })
            if (metaFile != null) {
                const tmp = metaFile.getData().toString()
                tmp.split(new RegExp('(\r\n|\n)')).forEach(metaEntry => {
                    if (metaEntry.includes('=')) {
                        meta[metaEntry.split('=')[0]] = (metaEntry.includes(',') || metaEntry.startsWith("tags")) ? metaEntry.split('=')[1].split(',') : metaEntry.split('=')[1]
                    }
                })
            } else meta.name = patch.replace('_', ' ').replace('.zip', '')
            list.push(meta)
            console.log(`${meta.name} by ${meta.author} added.`)
        }
        fs.writeFileSync('patches.json', JSON.stringify(list, null, 2))
    }
}

run().then(() => console.log('Done.'))