import React from 'react';
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

function FotoItem({ foto, onDelete, index }) {
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
      className="relative bg-white rounded-xl border border-gray-200 overflow-hidden group shadow-sm"
    >
      {/* Número de ordem */}
      <div className="absolute top-2 left-2 bg-black/50 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold z-10">
        {index + 1}
      </div>

      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-8 z-10 drag-handle opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded p-1"
        title="Arrastar para reordenar"
      >
        <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
        </svg>
      </div>

      {/* Botão deletar */}
      <button
        onClick={() => onDelete(foto.id)}
        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs hover:bg-red-600"
        title="Remover foto"
      >
        ×
      </button>

      {/* Imagem — CDN lh3 (rápido); se falhar, cai para a URL original do Drive */}
      <div className="aspect-square overflow-hidden bg-gray-50">
        <img
          src={driveImg(foto.drive_file_id || fileIdFromUrl(foto.drive_url), 500) || foto.thumbnail_url || foto.drive_url}
          alt={foto.nome_arquivo}
          className="w-full h-full object-cover"
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
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${badge.cor}`}>{badge.label}</span>
      </div>
    </div>
  );
}

export default function FotoGrid({ fotos, onReorder, onDelete }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
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
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={fotos.map(f => f.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {fotos.map((foto, i) => (
            <FotoItem key={foto.id} foto={foto} onDelete={onDelete} index={i} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
