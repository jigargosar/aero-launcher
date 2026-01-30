import { exec } from 'child_process'
import { Item, Provider } from '@shared/types'
import { Icons } from '@shared/icons'

const POWER_ACTIONS: Item[] = [
    {
        id: 'power:shutdown',
        name: 'Shut Down',
        icon: Icons.system,
        moduleId: 'system',
        metadata: { category: 'power', cmd: 'shutdown /s /t 0' },
        triggers: ['execute'],
    },
    {
        id: 'power:restart',
        name: 'Restart',
        icon: Icons.system,
        moduleId: 'system',
        metadata: { category: 'power', cmd: 'shutdown /r /t 0' },
        triggers: ['execute'],
    },
    {
        id: 'power:sleep',
        name: 'Sleep',
        icon: Icons.system,
        moduleId: 'system',
        metadata: { category: 'power', cmd: 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0' },
        triggers: ['execute'],
    },
    {
        id: 'power:lock',
        name: 'Lock',
        icon: Icons.system,
        moduleId: 'system',
        metadata: { category: 'power', cmd: 'rundll32.exe user32.dll,LockWorkStation' },
        triggers: ['execute'],
    },
    {
        id: 'power:signout',
        name: 'Sign Out',
        icon: Icons.system,
        moduleId: 'system',
        metadata: { category: 'power', cmd: 'shutdown /l' },
        triggers: ['execute'],
    },
]

const POWER_CATEGORY: Item = {
    id: 'power:category',
    name: 'Power Commands',
    icon: Icons.system,
    moduleId: 'system',
    metadata: { kind: 'power-category' },
    triggers: ['browse'],
}

export const systemProvider: Provider = {
    id: 'system',

    getRootItems: async () => [...POWER_ACTIONS, POWER_CATEGORY],

    onTrigger: async (item, trigger) => {
        if (trigger.type === 'execute') {
            const cmd = item.metadata.cmd as string
            exec(cmd)
            return { type: 'resetAndHide' }
        }

        if (trigger.type === 'browse' && item.metadata.kind === 'power-category') {
            return { type: 'pushList', items: POWER_ACTIONS }
        }

        return { type: 'noop' }
    },
}
