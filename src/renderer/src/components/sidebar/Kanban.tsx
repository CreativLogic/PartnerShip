import { useState } from 'react'
import { nanoid } from 'nanoid'
import { useApp } from '../../store/app'
import type { KanbanBoard, KanbanCard } from '@common/types'
import { Plus, MessagesSquare, FileText, Trash2 } from 'lucide-react'

function addCard(board: KanbanBoard, columnId: string, title: string): KanbanBoard {
  const card: KanbanCard = { id: nanoid(), title, createdAt: Date.now() }
  const columns = board.columns.map((c) =>
    c.id === columnId ? { ...c, cardIds: [...c.cardIds, card.id] } : c
  )
  return { columns, cards: { ...board.cards, [card.id]: card } }
}

function moveCard(board: KanbanBoard, cardId: string, toColumn: string): KanbanBoard {
  const columns = board.columns.map((c) => ({
    ...c,
    cardIds: c.cardIds.filter((id) => id !== cardId)
  }))
  const target = columns.find((c) => c.id === toColumn)
  if (target) target.cardIds.push(cardId)
  return { ...board, columns }
}

function removeCard(board: KanbanBoard, cardId: string): KanbanBoard {
  const columns = board.columns.map((c) => ({ ...c, cardIds: c.cardIds.filter((id) => id !== cardId) }))
  const cards = { ...board.cards }
  delete cards[cardId]
  return { columns, cards }
}

export function KanbanCompact(): JSX.Element {
  const board = useApp((s) => s.kanban)
  const save = useApp((s) => s.saveKanban)
  const setFull = useApp((s) => s.setKanbanFull)

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b border-base-700/50 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-ink-faint">Board</span>
        <button className="ps-tab" onClick={() => setFull(true)}>Open full</button>
      </div>
      <div className="flex-1 overflow-auto p-2 flex flex-col gap-3">
        {board.columns.map((col) => (
          <div key={col.id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-ink-dim">{col.title}</span>
              <button
                className="text-ink-faint hover:text-ink"
                onClick={() => {
                  const t = prompt(`New card in ${col.title}`)
                  if (t) void save(addCard(board, col.id, t))
                }}
              >
                <Plus size={13} />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {col.cardIds.map((id) => {
                const card = board.cards[id]
                if (!card) return null
                return (
                  <div key={id} className="text-sm bg-base-850 rounded px-2 py-1.5 truncate border border-base-700/50">
                    {card.title}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function KanbanBoardView(): JSX.Element {
  const board = useApp((s) => s.kanban)
  const save = useApp((s) => s.saveKanban)
  const newSession = useApp((s) => s.newSession)
  const bindPane = useApp((s) => s.bindPane)
  const [drag, setDrag] = useState<string | null>(null)

  return (
    <div className="ps-panel h-full flex flex-col">
      <div className="px-3 py-2 border-b border-base-700/60">
        <span className="text-sm font-medium">Kanban — idea board</span>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <div className="grid grid-cols-4 gap-3 h-full min-w-[820px]">
          {board.columns.map((col) => (
            <div
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (drag) void save(moveCard(board, drag, col.id))
                setDrag(null)
              }}
              className="flex flex-col bg-base-900/60 rounded-lg border border-base-700/50 min-h-0"
            >
              <div className="flex items-center justify-between px-2.5 py-2 border-b border-base-700/50">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-dim">{col.title}</span>
                <span className="text-[11px] text-ink-faint">{col.cardIds.length}</span>
              </div>
              <div className="flex-1 overflow-auto p-2 flex flex-col gap-2">
                {col.cardIds.map((id) => {
                  const card = board.cards[id]
                  if (!card) return null
                  return (
                    <div
                      key={id}
                      draggable
                      onDragStart={() => setDrag(id)}
                      className="group bg-base-850 rounded-md border border-base-700/60 p-2.5 cursor-grab active:cursor-grabbing"
                    >
                      <div className="text-sm">{card.title}</div>
                      {card.description && (
                        <div className="text-[11px] text-ink-faint mt-1 line-clamp-2">{card.description}</div>
                      )}
                      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="ps-tab text-[11px]"
                          title="Create session from card"
                          onClick={() => {
                            const s = newSession('mock', {
                              title: card.title,
                              linkedCardId: card.id,
                              messages: card.description
                                ? [{ id: nanoid(), role: 'system', content: card.description, ts: Date.now() }]
                                : []
                            })
                            void save({ ...board, cards: { ...board.cards, [id]: { ...card, sessionId: s.id } } })
                            bindPane(0, s.id)
                          }}
                        >
                          <MessagesSquare size={11} /> Session
                        </button>
                        <button
                          className="ps-tab text-[11px]"
                          title="Attach markdown file"
                          onClick={() => {
                            const name = prompt('Markdown file for this card:', `${card.title.toLowerCase().replace(/\s+/g, '-')}.md`)
                            if (name) void save({ ...board, cards: { ...board.cards, [id]: { ...card, filePath: name } } })
                          }}
                        >
                          <FileText size={11} />
                        </button>
                        <button
                          className="ps-tab text-[11px] ml-auto"
                          onClick={() => void save(removeCard(board, id))}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  )
                })}
                <button
                  className="text-xs text-ink-faint hover:text-ink py-1 flex items-center gap-1 justify-center rounded hover:bg-base-850"
                  onClick={() => {
                    const t = prompt(`New card in ${col.title}`)
                    if (t) void save(addCard(board, col.id, t))
                  }}
                >
                  <Plus size={12} /> Add card
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
