/**
 * Sidebar — counterpart of sfx2/source/sidebar/SidebarController.cxx with its
 * TabBar and Deck. Decks are supplied by the application module (Writer
 * registers Properties, Styles and Navigator, as in Sidebar.xcu).
 */
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { CommandImage } from "../../../vcl/source/image/ImplImageTree";

export interface SfxSidebarDeck {
  id: string;
  title: string;
  /** Command whose image is used for the tab. */
  icon: string;
  content: ReactNode;
}

export function Sidebar({
  decks,
  current,
  onDeck,
  onClose,
}: {
  decks: SfxSidebarDeck[];
  current: string;
  onDeck: (id: string) => void;
  onClose: () => void;
}) {
  const deck = decks.find((d) => d.id === current) ?? decks[0];
  return (
    <aside className="sfx-sidebar">
      <div className="sfx-deck">
        <div className="sfx-deck-title">
          <span>{deck.title}</span>
          <button aria-label="Close Sidebar Deck" title="Close Sidebar Deck" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <div className="sfx-deck-content">{deck.content}</div>
      </div>
      <nav className="sfx-tabbar" aria-label="Sidebar decks">
        {decks.map((d) => (
          <button
            key={d.id}
            title={d.title}
            aria-label={d.title}
            aria-pressed={d.id === deck.id}
            className="vcl-toolbox-button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onDeck(d.id)}
          >
            <CommandImage command={d.icon} />
          </button>
        ))}
      </nav>
    </aside>
  );
}
