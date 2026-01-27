import {shell} from 'electron'
import {ListItem} from '@shared/types'
import {Icons} from '@shared/icons'
import {StoreAPI} from './store'

export const WebSearch = {
    id: 'websearch',

    async start(onUpdate: (items: ListItem[]) => void, store: StoreAPI): Promise<void> {
        store.registerExecuteHandler('websearch', () => {
            shell.openExternal('https://google.com')
        })

        store.registerInputHandler('websearch', {
            onQuery: (_item, _text, emit) => {
                // TODO: fetch suggestions from Google API
                emit([])
            },
            onSubmit: (_item, text) => {
                shell.openExternal(`https://google.com/search?q=${encodeURIComponent(text)}`)
            }
        })

        onUpdate([
            {
                sourceId: 'websearch',
                id: 'websearch:google',
                name: 'Google Search',
                icon: Icons.search,
                actions: [
                    {type: 'execute'},
                    {type: 'input', placeholder: 'Search Google...'}
                ]
            }
        ])
    }
}
