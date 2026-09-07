import React, { useState, useEffect, useMemo } from 'react';
import { useClients } from '../hooks/useClients';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, 
  Search, 
  UserPlus, 
  Phone, 
  User as UserIcon, 
  X, 
  Edit2, 
  Trash2, 
  AlertCircle,
  Tag as TagIcon,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { cn, validateKenyanPhone } from '../lib/utils';
import { Client } from '../types';
import { ClientTagBadge, ClientTagSelector } from '../components/ClientTags';
import { DEFAULT_TAG_SUGGESTIONS } from '../lib/tags';

const clientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  sex: z.enum(['Male', 'Female', 'Other']),
  phone: z.string().refine(validateKenyanPhone, {
    message: 'Invalid Kenyan phone format (e.g., +254712345678)'
  }),
});

type ClientFormValues = z.infer<typeof clientSchema>;

const Clients: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { clients, rawClients, allTags, loading, addClient, updateClient, deleteClient } = useClients(debouncedSearch, selectedTag);
  const [isAdding, setIsAdding] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [formTags, setFormTags] = useState<string[]>([]);

  // Compute available tags for filter bar (preset + any dynamic tags from clients)
  const filterTagOptions = useMemo(() => {
    const combined = Array.from(new Set([...DEFAULT_TAG_SUGGESTIONS, ...allTags]));
    return combined;
  }, [allTags]);

  // Compute tag counts across all raw clients
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rawClients.forEach(c => {
      if (Array.isArray(c.tags)) {
        c.tags.forEach(t => {
          counts[t] = (counts[t] || 0) + 1;
        });
      }
    });
    return counts;
  }, [rawClients]);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: { sex: 'Male', phone: '+254' }
  });

  const phoneValue = watch('phone');

  // Auto-format phone number
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    val = val.replace(/[^\d+]/g, '');

    if (val.startsWith('0') && val.length > 1) {
      val = '+254' + val.substring(1);
    } else if (/^[71]/.test(val) && val.length === 1) {
      val = '+254' + val;
    } else if (val.startsWith('254') && !val.startsWith('+')) {
      val = '+' + val;
    } else if (/^\d/.test(val)) {
      val = '+' + val;
    }

    setValue('phone', val);
  };

  const onSubmit = async (data: ClientFormValues) => {
    try {
      if (editingClient) {
        await updateClient(editingClient.id, {
          ...data,
          tags: formTags
        });
        toast.success('Client updated successfully');
        setEditingClient(null);
      } else {
        await addClient({
          ...data,
          tags: formTags
        });
        toast.success('Client added successfully');
        setIsAdding(false);
      }
      reset();
      setFormTags([]);
    } catch (error) {
      toast.error(editingClient ? 'Failed to update client' : 'Failed to add client');
    }
  };

  const handleDelete = async () => {
    if (!deletingClient) return;
    try {
      await deleteClient(deletingClient.id);
      toast.success('Client and history deleted');
      setDeletingClient(null);
    } catch (error) {
      toast.error('Failed to delete client');
    }
  };

  const startEdit = (client: Client) => {
    setEditingClient(client);
    setValue('name', client.name);
    setValue('sex', client.sex as any);
    setValue('phone', client.phone);
    setFormTags(client.tags || []);
  };

  const highlightMatch = (text: string, term: string) => {
    if (!term.trim()) return text;
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedTerm})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === term.toLowerCase() ? (
            <span key={i} className="bg-emerald-100 text-emerald-900 px-0.5 rounded-sm font-bold">{part}</span>
          ) : part
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Clients</h1>
          <p className="text-zinc-500 text-sm">Manage, tag, and track your clinic's patient records.</p>
        </div>
        <button
          id="btn-add-client-main"
          onClick={() => {
            setEditingClient(null);
            reset({ sex: 'Male', name: '', phone: '+254' });
            setFormTags([]);
            setIsAdding(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-emerald-800 transition-colors shadow-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>Add Client</span>
        </button>
      </div>

      {/* Search Bar & Tag Filter Controls */}
      <div className="space-y-3">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-primary transition-colors" />
          <input
            id="input-search-clients"
            type="text"
            placeholder="Search by client name, phone number, or tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm text-sm"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 rounded-full"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tag Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap text-xs pt-1" id="tag-filter-bar">
          <div className="flex items-center gap-1.5 text-zinc-400 font-semibold uppercase tracking-wider text-[10px] mr-1 shrink-0">
            <Filter className="w-3 h-3 text-primary" />
            <span>Filter by Tag:</span>
          </div>

          <button
            id="btn-filter-tag-all"
            onClick={() => setSelectedTag('all')}
            className={cn(
              "px-3 py-1.5 rounded-xl font-medium transition-all border shrink-0",
              selectedTag === 'all'
                ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
            )}
          >
            All Clients ({rawClients.length})
          </button>

          {filterTagOptions.map((tag) => {
            const count = tagCounts[tag] || 0;
            const isSelected = selectedTag === tag;
            return (
              <button
                key={tag}
                id={`btn-filter-tag-${tag.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setSelectedTag(isSelected ? 'all' : tag)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all border shrink-0",
                  isSelected
                    ? "bg-primary text-white border-primary shadow-xs ring-2 ring-primary/30 ring-offset-1"
                    : count > 0 
                      ? "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                      : "bg-zinc-50/70 text-zinc-400 border-dashed border-zinc-200 hover:bg-zinc-100 hover:text-zinc-600"
                )}
              >
                <span>{tag}</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                  isSelected 
                    ? "bg-white/20 text-white" 
                    : count > 0 ? "bg-zinc-100 text-zinc-600" : "bg-zinc-100 text-zinc-400"
                )}>
                  {count}
                </span>
                {isSelected && <X className="w-3 h-3 ml-0.5" />}
              </button>
            );
          })}

          {selectedTag !== 'all' && (
            <button
              onClick={() => setSelectedTag('all')}
              className="text-[11px] text-zinc-500 hover:text-primary underline ml-1"
            >
              Reset filter
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Notice */}
      {selectedTag !== 'all' && (
        <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-200/80 px-4 py-2.5 rounded-xl text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <TagIcon className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Showing clients tagged with <strong className="font-bold underline">{selectedTag}</strong> ({clients.length} {clients.length === 1 ? 'client' : 'clients'})</span>
          </div>
          <button
            onClick={() => setSelectedTag('all')}
            className="font-bold text-primary hover:underline ml-2"
          >
            Clear tag filter
          </button>
        </div>
      )}

      {/* Clients Table/Grid */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left" id="clients-table">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Client Name & Profile</th>
                <th className="px-6 py-4">Tags</th>
                <th className="px-6 py-4">Sex</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-400">Loading clients...</td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <UserPlus className="w-12 h-12 text-zinc-200" />
                      <p className="text-zinc-700 font-medium">
                        {selectedTag !== 'all' 
                          ? `No clients found with tag "${selectedTag}"`
                          : searchTerm 
                            ? `No clients match "${searchTerm}"`
                            : 'No clients found'
                        }
                      </p>
                      {selectedTag !== 'all' ? (
                        <button 
                          onClick={() => setSelectedTag('all')} 
                          className="text-primary text-sm font-semibold hover:underline"
                        >
                          Clear tag filter to see all {rawClients.length} clients
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            setEditingClient(null);
                            reset({ sex: 'Male', name: '', phone: '+254' });
                            setFormTags([]);
                            setIsAdding(true);
                          }} 
                          className="text-primary text-sm font-semibold hover:underline"
                        >
                          Add your first client
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <tr key={client.id} className="hover:bg-zinc-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <Link to={`/clients/${client.id}`} className="flex items-center gap-3 group-hover:cursor-pointer">
                        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-primary font-bold shrink-0 shadow-xs">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-zinc-900 group-hover:text-primary transition-colors block">
                            {highlightMatch(client.name, debouncedSearch)}
                          </span>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      {Array.isArray(client.tags) && client.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 items-center max-w-xs">
                          {client.tags.map((tag) => (
                            <ClientTagBadge
                              key={tag}
                              tag={tag}
                              active={selectedTag === tag}
                              onClick={() => setSelectedTag(selectedTag === tag ? 'all' : tag)}
                            />
                          ))}
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(client)}
                          className="text-[11px] text-zinc-400 hover:text-primary hover:bg-emerald-50 px-2 py-0.5 rounded border border-dashed border-zinc-200 transition-colors inline-flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add tag</span>
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">{client.sex}</td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "flex items-center gap-2 text-sm transition-colors",
                        debouncedSearch && client.phone.toLowerCase().includes(debouncedSearch.toLowerCase()) 
                          ? "text-primary font-medium" 
                          : "text-zinc-600"
                      )}>
                        <Phone className={cn(
                          "w-3.5 h-3.5",
                          debouncedSearch && client.phone.toLowerCase().includes(debouncedSearch.toLowerCase()) 
                            ? "text-primary" 
                            : "text-zinc-400"
                        )} />
                        {highlightMatch(client.phone, debouncedSearch)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          id={`btn-edit-client-${client.id}`}
                          onClick={() => startEdit(client)}
                          className="p-2 text-zinc-400 hover:text-primary hover:bg-emerald-50 rounded-lg transition-all"
                          title="Edit Client & Tags"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          id={`btn-delete-client-${client.id}`}
                          onClick={() => setDeletingClient(client)}
                          className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete Client"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <Link 
                          to={`/clients/${client.id}`}
                          className="px-3 py-1 text-primary text-xs font-bold hover:bg-emerald-50 rounded-md transition-colors"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Client Modal */}
      <AnimatePresence>
        {(isAdding || editingClient) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => {
                setIsAdding(false);
                setEditingClient(null);
                setFormTags([]);
                reset();
              }}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">
                    {editingClient ? 'Edit Client Profile' : 'Add New Client'}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {editingClient ? 'Update details, contact info, and categorization tags' : 'Register a new patient and assign organization tags'}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setIsAdding(false);
                    setEditingClient(null);
                    setFormTags([]);
                    reset();
                  }}
                  className="p-1 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      id="input-client-name"
                      {...register('name')}
                      type="text"
                      className={cn(
                        "w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none transition-all text-sm",
                        errors.name ? "border-red-300 ring-4 ring-red-50" : "border-zinc-200 focus:ring-4 focus:ring-primary/10 focus:border-primary"
                      )}
                      placeholder="e.g. Jane Doe"
                    />
                  </div>
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-1">Sex</label>
                    <select
                      id="select-client-sex"
                      {...register('sex')}
                      className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all appearance-none bg-white text-sm"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-1">Contact Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        id="input-client-phone"
                        {...register('phone', { onChange: handlePhoneChange })}
                        type="text"
                        className={cn(
                          "w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none transition-all text-sm",
                          errors.phone ? "border-red-300 ring-4 ring-red-50" : "border-zinc-200 focus:ring-4 focus:ring-primary/10 focus:border-primary"
                        )}
                        placeholder="+254712345678"
                      />
                    </div>
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                  </div>
                </div>

                {/* Custom Tags Selector */}
                <div className="pt-2 border-t border-zinc-100">
                  <ClientTagSelector
                    selectedTags={formTags}
                    onChange={setFormTags}
                    availableTags={allTags}
                    label="Profile Tags"
                    helperText="Assign one or more tags (e.g. 'Chronic', 'Follow-up', 'Consultation') to organize and filter patients."
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setEditingClient(null);
                      setFormTags([]);
                      reset();
                    }}
                    className="flex-1 px-4 py-2.5 border border-zinc-200 rounded-xl font-medium text-zinc-600 hover:bg-zinc-50 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="btn-submit-client"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-emerald-800 transition-colors shadow-lg shadow-emerald-100 disabled:opacity-50 text-sm"
                  >
                    {isSubmitting ? 'Saving...' : editingClient ? 'Update Profile' : 'Save Client'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setDeletingClient(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 mb-2">Delete Client?</h3>
                <p className="text-sm text-zinc-500 mb-6">
                  This will permanently delete <span className="font-bold text-zinc-700">{deletingClient.name}</span> and all their visit/appointment history. This action cannot be undone.
                </p>
                <div className="flex w-full gap-3">
                  <button
                    onClick={() => setDeletingClient(null)}
                    className="flex-1 px-4 py-2 bg-zinc-100 text-zinc-600 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-confirm-delete-client"
                    onClick={handleDelete}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Clients;
