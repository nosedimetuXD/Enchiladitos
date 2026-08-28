import { useEffect } from 'react'

export function useEvents(eventTypes, onEvent) {
    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) return

        const evtSource = new EventSource(`http://localhost:8080/events?token=${token}`)

        const listeners = eventTypes.map((type) => {
            const handler = (e) => onEvent(type, JSON.parse(e.data))
            evtSource.addEventListener(type, handler)
            return { type, handler }
        })

        return () => {
            listeners.forEach(({ type, handler }) => evtSource.removeEventListener(type, handler))
            evtSource.close()
        }
    }, [eventTypes, onEvent])
}