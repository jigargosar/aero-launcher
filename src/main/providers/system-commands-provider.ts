import { exec } from 'child_process'
import { Item, Provider } from '@shared/types'
import { Icons } from '@shared/icons'

const POWER_ACTIONS: Item[] = [
    {
        id: 'system-commands:shutdown',
        name: 'Shut Down',
        icon: Icons.power,
        moduleId: 'system-commands',
        metadata: { category: 'power', cmd: 'shutdown /s /t 0' },
        triggers: ['execute'],
    },
    {
        id: 'system-commands:restart',
        name: 'Restart',
        icon: Icons.power,
        moduleId: 'system-commands',
        metadata: { category: 'power', cmd: 'shutdown /r /t 0' },
        triggers: ['execute'],
    },
    {
        id: 'system-commands:sleep',
        name: 'Sleep',
        icon: Icons.power,
        moduleId: 'system-commands',
        metadata: { category: 'power', cmd: 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0' },
        triggers: ['execute'],
    },
    {
        id: 'system-commands:lock',
        name: 'Lock',
        icon: Icons.power,
        moduleId: 'system-commands',
        metadata: { category: 'power', cmd: 'rundll32.exe user32.dll,LockWorkStation' },
        triggers: ['execute'],
    },
    {
        id: 'system-commands:signout',
        name: 'Sign Out',
        icon: Icons.power,
        moduleId: 'system-commands',
        metadata: { category: 'power', cmd: 'shutdown /l' },
        triggers: ['execute'],
    },
]

const PowerCategoryItem: Item = {
    id: 'system-commands:category:power',
    name: 'Power Commands',
    icon: Icons.power,
    moduleId: 'system-commands',
    metadata: {},
    triggers: ['browse'],
}

export const systemCommandsProvider: Provider = {
    id: 'system-commands',

    getRootItems: async () => [...POWER_ACTIONS, PowerCategoryItem],

    onTrigger: async (item, trigger) => {
        if (trigger.type === 'execute') {
            const cmd = item.metadata.cmd as string
            exec(cmd)
            return { type: 'resetAndHide' }
        }

        if (trigger.type === 'browse' && item.id === PowerCategoryItem.id) {
            return { type: 'pushList', items: POWER_ACTIONS }
        }

        return { type: 'noop' }
    },
}
