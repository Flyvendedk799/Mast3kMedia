import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, Image, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  folder?: string;
}

const ImageUpload = ({ value, onChange, label = 'Image', folder = 'thumbnails' }: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const upload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image file.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 5MB allowed.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from('project-images').upload(path, file);
    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } else {
      const { data: urlData } = supabase.storage.from('project-images').getPublicUrl(path);
      onChange(urlData.publicUrl);
      toast({ title: 'Image uploaded!' });
    }
    setUploading(false);
  }, [folder, onChange, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }, [upload]);

  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-border group">
          <img src={value} alt="" className="w-full h-32 object-cover" />
          <button
            onClick={() => onChange('')}
            className="absolute top-2 right-2 p-1 rounded-full bg-background/80 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-muted-foreground/50 hover:bg-muted/20'
          }`}
        >
          {uploading ? (
            <Loader2 size={24} className="mx-auto text-primary animate-spin" />
          ) : (
            <>
              <Upload size={24} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">
                Drag & drop or <span className="text-primary">browse</span>
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">Max 5MB</p>
            </>
          )}
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) upload(file);
        e.target.value = '';
      }} />
    </div>
  );
};

export default ImageUpload;
