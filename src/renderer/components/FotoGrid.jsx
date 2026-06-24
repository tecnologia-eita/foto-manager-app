import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { driveImg, fileIdFromUrl } from '../api';

const STATUS_LABEL = {
  drive: { label: 'Drive', cor: 'bg-gray-100 text-gray-500' },
  synced_tiny: { label: 'Tiny ✓', cor: 'bg-blue-100 text-blue-600' },
  synced_wbuy: { label: 'Wbuy ✓', cor: 'bg-purple-100 text-purple-600' },
  synced_ambos: { label: 'Ambos ✓', cor: 'bg-green-100 text-green-600' },
};

function FotoItem({ foto, onDelete, onView, index }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: foto.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  const badge = STATUS_LABEL[foto.status] || STATUS_LABEL.drive;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative bg-white rounded-xl border border-gray-200 overflow-hidden group shadow-sm cursor-grab active:cursor-grabbing touch-none"
    >
      {/* Número de ordem (arrastar funciona em qualquer ponto da foto) */}
      <div
        className="absolute top-2 left-2 z-10 flex items-center justify-center w-5 h-5 bg-black/55 group-hover:bg-black/75 text-white text-xs font-bold rounded-full transition-colors"
        title="Arraste para reordenar"
      >
        <span>{index + 1}</span>
      </div>

      {/* Botão baixar (no topo, ao lado do excluir) */}
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={() => window.electronAPI?.downloadUrl?.(foto.drive_url || foto.thumbnail_url, foto.nome_arquivo)}
        className="absolute top-2 right-8 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/55 text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/80"
        title="Baixar foto"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M12 16a1 1 0 01-.7-.3l-4-4a1 1 0 011.4-1.4L11 12.6V4a1 1 0 112 0v8.6l2.3-2.3a1 1 0 011.4 1.4l-4 4a1 1 0 01-.7.3z"/>
          <path d="M5 20a1 1 0 010-2h14a1 1 0 010 2H5z"/>
        </svg>
      </button>

      {/* Botão deletar */}
      <button
        onPointerDown={e => e.stopPropagation()}
        onClick={() => onDelete(foto.id)}
        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-600"
        title="Remover foto"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
          <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd"/>
        </svg>
      </button>

      {/* Imagem — CDN lh3 (rápido); se falhar, cai para a URL original do Drive. Clique abre o lightbox. */}
      <div className="aspect-square overflow-hidden bg-gray-50" onClick={() => onView?.(foto)}>
        <img
          src={driveImg(foto.drive_file_id || fileIdFromUrl(foto.drive_url), 500) || foto.thumbnail_url || foto.drive_url}
          alt={foto.nome_arquivo}
          className="w-full h-full object-cover pointer-events-none"
          draggable={false}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={e => {
            const fb = foto.thumbnail_url || foto.drive_url;
            if (fb && e.target.src !== fb) { e.target.src = fb; }
            else { e.target.style.display = 'none'; }
          }}
        />
      </div>

      {/* Info */}
      <div className="p-2">
        <p className="text-xs text-gray-500 truncate" title={foto.nome_arquivo}>{foto.nome_arquivo}</p>
        <div className="flex items-center justify-between gap-1">
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${badge.cor}`}>{badge.label}</span>
          {foto.uploaded_by && (
            <span className="text-[10px] text-gray-400 truncate" title={`Enviada por ${foto.uploaded_by}`}>por {foto.uploaded_by}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FotoGrid({ fotos, onReorder, onDelete }) {
  const [lightbox, setLightbox] = useState(null);
  React.useEffect(() => {
    if (!lightbox) return;
    const onKey = e => { if (e.key === 'Escape') setLightbox(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);
  const sensors = useSensors(
    // distância mínima antes de iniciar o arraste — assim um clique simples ainda
    // abre o lightbox e os botões funcionam; só vira "arrastar" ao mover ~6px
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fotos.findIndex(f => f.id === active.id);
    const newIndex = fotos.findIndex(f => f.id === over.id);
    onReorder(oldIndex, newIndex);
  }

  if (fotos.length === 0) {
    return (
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
        <div className="text-4xl mb-2">🖼️</div>
        <p className="text-gray-400 text-sm">Nenhuma foto. Clique em "Adicionar fotos" para começar.</p>
      </div>
    );
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={fotos.map(f => f.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {fotos.map((foto, i) => (
              <FotoItem key={foto.id} foto={foto} onDelete={onDelete} onView={setLightbox} index={i} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-8 cursor-zoom-out"
        >
          <img
            src={driveImg(lightbox.drive_file_id || fileIdFromUrl(lightbox.drive_url), 1600) || lightbox.drive_url}
            alt={lightbox.nome_arquivo}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            referrerPolicy="no-referrer"
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl leading-none"
            title="Fechar (Esc)"
          >×</button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">{lightbox.nome_arquivo}</div>
        </div>
      )}
    </>
  );
}
