import {ListItem} from "@shared/types";

interface Store {
}

export const Store = {
    init(emit: (items: ListItem[]) => void): Store {
        const items: ListItem[] = [
            { id: '1', name: 'Item 1' },
            { id: '2', name: 'Item 2' },
        ]

        emit(items)

        return {}
    }
}
