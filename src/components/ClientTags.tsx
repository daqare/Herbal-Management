import React, { useState } from 'react';
import { Tag as TagIcon, Plus, X, Check } from 'lucide-react';
import { DEFAULT_TAG_SUGGESTIONS, getTagStyle } from '../lib/tags';
import { cn } from '../lib/utils';

interface ClientTagBadgeProps {
  tag: string;
  onClick?: () => void;
  onRemove?: () => void;
  size?: 'sm' | 'md';
  active?: boolean;
  className?: string;
}

export const ClientTagBadge: React.FC<ClientTagBadgeProps> = ({
  tag,
  onClick,
  onRemove,
  size = 'sm',
  active = false,
  className
}) => {
  const style = getTagStyle(tag);

  return (
    <span
      id={`client-tag-${tag.toLowerCase().replace(/\s+/g, '-')}`}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-lg transition-all border whitespace-nowrap select-none",
        size === 'sm' ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        style.bg,
        style.text,
        style.border,
        onClick && "cursor-pointer hover:opacity-85 hover:shadow-xs active:scale-95",
        active && "ring-2 ring-primary ring-offset-1 font-bold",
        className
      )}
      title={onClick ? `Filter by ${tag}` : undefined}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", style.dot)} />
      <span>{tag}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 -mr-0.5 p-0.5 hover:bg-black/10 rounded-full transition-colors text-inherit"
          title={`Remove ${tag}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};

interface ClientTagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  availableTags?: string[];
  label?: string;
  helperText?: string;
}

export const ClientTagSelector: React.FC<ClientTagSelectorProps> = ({
  selectedTags = [],
  onChange,
  availableTags = [],
  label = 'Client Tags',
  helperText = 'Assign tags like Chronic, Follow-up, or create custom ones'
}) => {
  const [customInput, setCustomInput] = useState('');
  const [error, setError] = useState('');

  // Combine preset defaults with any available tags from other clients
  const allSuggestions = Array.from(
    new Set([...DEFAULT_TAG_SUGGESTIONS, ...availableTags])
  ).filter(Boolean);

  const handleToggleTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (selectedTags.includes(trimmed)) {
      onChange(selectedTags.filter(t => t !== trimmed));
    } else {
      if (selectedTags.length >= 15) {
        setError('Maximum 15 tags per client profile');
        return;
      }
      setError('');
      onChange([...selectedTags, trimmed]);
    }
  };

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (trimmed.length > 25) {
      setError('Tag must be 25 characters or fewer');
      return;
    }
    if (selectedTags.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      setError('Tag already added');
      return;
    }
    if (selectedTags.length >= 15) {
      setError('Maximum 15 tags per client profile');
      return;
    }
    setError('');
    onChange([...selectedTags, trimmed]);
    setCustomInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustom();
    }
  };

  return (
    <div className="space-y-3" id="client-tag-selector">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-zinc-700 flex items-center gap-1.5">
          <TagIcon className="w-3.5 h-3.5 text-primary" />
          {label}
        </label>
        <span className="text-[11px] text-zinc-400 font-medium">
          {selectedTags.length} assigned
        </span>
      </div>

      {/* Currently Selected Tags */}
      {selectedTags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-xl min-h-[38px] items-center">
          {selectedTags.map((tag) => (
            <ClientTagBadge
              key={tag}
              tag={tag}
              onRemove={() => handleToggleTag(tag)}
            />
          ))}
        </div>
      ) : (
        <div className="text-xs text-zinc-400 italic bg-zinc-50/70 border border-dashed border-zinc-200 rounded-xl p-2.5 text-center">
          No tags assigned yet. Select from suggestions below or create your own.
        </div>
      )}

      {/* Custom Tag Input */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            id="input-custom-tag"
            type="text"
            value={customInput}
            onChange={(e) => {
              setCustomInput(e.target.value);
              if (error) setError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type custom tag (e.g. Hypertension, Senior)..."
            className="w-full px-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            maxLength={25}
          />
        </div>
        <button
          type="button"
          id="btn-add-custom-tag"
          onClick={handleAddCustom}
          disabled={!customInput.trim()}
          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </div>

      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

      {/* Suggested Quick Tags */}
      <div>
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
          Suggested & Common Tags:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {allSuggestions.map((suggestion) => {
            const isSelected = selectedTags.includes(suggestion);
            return (
              <button
                type="button"
                key={suggestion}
                id={`btn-toggle-suggested-${suggestion.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => handleToggleTag(suggestion)}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border",
                  isSelected
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                )}
              >
                {isSelected ? (
                  <Check className="w-3 h-3 text-white" />
                ) : (
                  <Plus className="w-3 h-3 text-zinc-400" />
                )}
                <span>{suggestion}</span>
              </button>
            );
          })}
        </div>
      </div>

      {helperText && (
        <p className="text-[11px] text-zinc-400 leading-normal">
          {helperText}
        </p>
      )}
    </div>
  );
};
