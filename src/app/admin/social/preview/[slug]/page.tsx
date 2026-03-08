'use client';

import { useState, useEffect, use } from 'react';
import { socialMediaGenerator } from '@/lib/social-media-generator';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Loader2, RefreshCw, Send, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface PostEditorProps {
  slug: string;
  post: {
    platform: 'twitter' | 'linkedin';
    content: string;
    imageUrl?: string;
    hashtags: string[];
    status: string;
    scheduledAt?: Date;
  };
  onUpdate: (platform: string, content: string, hashtags: string[]) => Promise<void>;
  onSchedule: (platform: string, delayMinutes: number) => Promise<void>;
}

function PostEditor({ slug, post, onUpdate, onSchedule }: PostEditorProps) {
  const [content, setContent] = useState(post.content);
  const [hashtags, setHashtags] = useState(post.hashtags.join(' '));
  const [isUpdating, setIsUpdating] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState(30);

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      await onUpdate(post.platform, content, hashtags.split(' ').filter(h => h.trim()));
      toast.success('Post updated successfully');
    } catch (error) {
      toast.error('Failed to update post');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSchedule = async () => {
    setIsScheduling(true);
    try {
      await onSchedule(post.platform, delayMinutes);
      toast.success('Post scheduled successfully');
    } catch (error) {
      toast.error('Failed to schedule post');
    } finally {
      setIsScheduling(false);
    }
  };

  const platformLabel = post.platform === 'twitter' ? 'Twitter / X' : 'LinkedIn';
  const charLimit = post.platform === 'twitter' ? 280 : 3000;
  const charCount = content.length;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {platformLabel}
              <Badge variant={post.status === 'posted' ? 'default' : post.status === 'scheduled' ? 'secondary' : 'outline'}>
                {post.status}
              </Badge>
            </CardTitle>
            <CardDescription>
              {post.platform === 'twitter' ? 'Max 280 characters' : 'Up to 3000 characters'}
            </CardDescription>
          </div>
          {post.scheduledAt && (
            <Badge variant="outline">
              <Calendar className="mr-1 h-3 w-3" />
              {new Date(post.scheduledAt).toLocaleString()}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {post.imageUrl && (
          <div className="relative aspect-square w-full max-w-sm mx-auto border rounded-lg overflow-hidden">
            <Image
              src={post.imageUrl}
              alt={`${post.platform} post image`}
              fill
              className="object-cover"
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Caption</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={post.platform === 'linkedin' ? 8 : 4}
            className={charCount > charLimit ? 'border-red-500' : ''}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{charCount} / {charLimit} characters</span>
            {charCount > charLimit && <span className="text-red-500">Exceeds limit!</span>}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Hashtags (space-separated)</label>
          <Textarea
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            rows={1}
            placeholder="#SaaS #MVP #Tech"
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={handleSave} disabled={isUpdating || charCount > charLimit}>
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>

        {post.status === 'draft' && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="number"
                min="0"
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(parseInt(e.target.value) || 0)}
                className="w-20 p-2 border rounded text-sm"
              />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
            <Button onClick={handleSchedule} disabled={isScheduling}>
              {isScheduling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Schedule
                </>
              )}
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

export default function SocialMediaPreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [assets, setAssets] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAssets = async () => {
    try {
      const response = await fetch(`/api/social/assets/${slug}`);
      if (!response.ok) {
        throw new Error('Failed to load assets');
      }
      const data = await response.json();
      setAssets(data.assets);
    } catch (error) {
      toast.error('Failed to load social media assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [slug]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/social/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, triggerEvent: false }),
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate assets');
      }

      toast.success('Assets regenerated successfully');
      await loadAssets();
    } catch (error) {
      toast.error('Failed to regenerate assets');
    } finally {
      setRefreshing(false);
    }
  };

  const handleUpdatePost = async (platform: string, content: string, hashtags: string[]) => {
    const response = await fetch(`/api/social/assets/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, content, hashtags }),
    });

    if (!response.ok) {
      throw new Error('Failed to update post');
    }

    await loadAssets();
  };

  const handleSchedulePost = async (platform: string, delayMinutes: number) => {
    const response = await fetch(`/api/social/assets/${slug}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, delayMinutes }),
    });

    if (!response.ok) {
      throw new Error('Failed to schedule post');
    }

    await loadAssets();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!assets) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>No Assets Generated</CardTitle>
            <CardDescription>
              Social media assets haven&apos;t been generated for this MVP yet.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Generate Assets
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Social Media Preview: {slug}</h1>
          <p className="text-muted-foreground">
            Review and edit your posts before scheduling
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          {refreshing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="twitter" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="twitter">Twitter / X</TabsTrigger>
          <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
        </TabsList>

        {['twitter', 'linkedin'].map((platform) => {
          const post = assets.posts.find((p: any) => p.platform === platform);
          if (!post) return null;

          return (
            <TabsContent key={platform} value={platform}>
              <PostEditor
                slug={slug}
                post={post}
                onUpdate={handleUpdatePost}
                onSchedule={handleSchedulePost}
              />
            </TabsContent>
          );
        })}
      </Tabs>

      {assets.imagePaths && assets.imagePaths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Images</CardTitle>
            <CardDescription>
              Product mockups created by OpenRouter
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assets.imagePaths.map((path: string, index: number) => (
                <div key={index} className="relative aspect-square border rounded-lg overflow-hidden">
                  <Image
                    src={path.replace(/^\/public/, '')}
                    alt={`Generated image ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
