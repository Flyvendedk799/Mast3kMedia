import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, Loader2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GalleryUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
}

const GalleryUpload = ({ value, onChange }: GalleryUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const upload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('project-images').upload(path, file);
    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } else {
      const { data } = supabase.storage.from('project-images').getPublicUrl(path);
      onChange([...value, data.publicUrl]);
    }
    setUploading(false);
  }, [value, onChange, toast]);

  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">Gallery Images</label>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
        {value.map((url, i) => (
          <div key={i} className="relative rounded-lg overflow-hidden border border-border group aspect-square">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        <button
          onClick={() => inputRef.current?.click()}
          className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-muted-foreground/50 hover:bg-muted/20 transition-all"
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) upload(file);
        e.target.value = '';
      }} />
    </div>
  );
};

export default GalleryUpload;
