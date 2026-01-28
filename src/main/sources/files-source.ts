import {ListItem, BrowsableSource} from '@shared/types'
import {Icons} from '@shared/icons'
import {shell} from 'electron'

// Mock file system
type MockFile = {
    name: string
    isFolder: boolean
    children?: MockFile[]
}

const mockFileSystem: MockFile = {
    name: 'Home',
    isFolder: true,
    children: [
        {
            name: 'Documents',
            isFolder: true,
            children: [
                {name: 'Projects', isFolder: true, children: [
                    {name: 'project1.txt', isFolder: false},
                    {name: 'project2.txt', isFolder: false},
                ]},
                {name: 'Notes', isFolder: true, children: [
                    {name: 'note1.md', isFolder: false},
                    {name: 'note2.md', isFolder: false},
                ]},
                {name: 'readme.txt', isFolder: false},
            ],
        },
        {
            name: 'Downloads',
            isFolder: true,
            children: [
                {name: 'image.png', isFolder: false},
                {name: 'archive.zip', isFolder: false},
            ],
        },
        {name: 'Desktop', isFolder: true, children: []},
    ],
}

const toListItem = (file: MockFile, path: string): ListItem => ({
    sourceId: 'files',
    id: `files:${path}/${file.name}`,
    name: file.name,
    icon: file.isFolder ? Icons.folder : Icons.file,
    metadata: {
        path: `${path}/${file.name}`,
        isFolder: String(file.isFolder),
    },
})

const findAtPath = (path: string): MockFile | null => {
    if (path === '' || path === '/') return mockFileSystem
    const parts = path.split('/').filter(Boolean)
    let current: MockFile = mockFileSystem
    for (const part of parts) {
        const child = current.children?.find(c => c.name === part)
        if (!child) return null
        current = child
    }
    return current
}

export const filesSource: BrowsableSource = {
    type: 'browsable',
    id: 'files',

    getItems: (query) => {
        // Show root folders in search
        const rootFolders = mockFileSystem.children ?? []
        const items = rootFolders.map(f => toListItem(f, ''))
        if (!query) return items
        const q = query.toLowerCase()
        return items.filter(item => item.name.toLowerCase().includes(q))
    },

    getChildren: (item) => {
        const path = item.metadata?.path ?? ''
        const folder = findAtPath(path)
        if (!folder || !folder.children) return []
        return folder.children.map(f => toListItem(f, path))
    },

    execute: (item) => {
        console.log(`[Files] Opening: ${item.metadata?.path}`)
        // In real impl: shell.openPath(item.metadata.path)
    },
}
