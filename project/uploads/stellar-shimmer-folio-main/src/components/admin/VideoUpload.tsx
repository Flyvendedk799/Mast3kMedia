import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, Video, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VideoUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
}

const VideoUpload = ({ value, onChange }: VideoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const upload = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast({ title: 'Invalid file', description: 'Please upload a video file.', variant: 'destructive' });
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 100MB allowed.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from('project-images').upload(path, file);
    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } else {
      const { data: urlData } = supabase.storage.from('project-images').getPublicUrl(path);
      onChange([...value, urlData.publicUrl]);
      toast({ title: 'Video uploaded!' });
    }
    setUploading(false);
  }, [value, onChange, toast]);

  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">Videos (upload or paste URL)</label>

      {/* Existing videos */}
      <div className="space-y-2 mb-2">
        {value.map((url, i) => (
          <div key={i} className="flex items-center gap-3 bg-muted/20 rounded-lg px-3 py-2 text-sm">
            <Video size={14} className="text-primary shrink-0" />
            <span className="text-muted-foreground flex-1 truncate font-mono text-xs">{url}</span>
            <button onClick={() => onChange(value.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Upload area */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer transition-all hover:border-muted-foreground/50 hover:bg-muted/20 disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 size={24} className="mx-auto text-primary animate-spin" />
        ) : (
          <>
            <Upload size={24} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">
              Click to upload video · <span className="text-primary">Max 100MB</span>
            </p>
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = '';
        }}
      />
    </div>
  );
};

export default VideoUpload;
