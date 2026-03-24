import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, MessageSquare } from 'lucide-react';
import penIcon from '@/assets/pen.svg';
import binIcon from '@/assets/bin.svg';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/hooks/use-toast';
import type { Announcement, AnnouncementComment } from '@/types/announcement';
import { BackButton } from '@/components/BackButton';

export function AdminAnnouncements() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [comments, setComments] = useState<Record<string, AnnouncementComment[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newAllowComments, setNewAllowComments] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editAllowComments, setEditAllowComments] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    void fetchAnnouncements();
  }, [user?.companyId]);

  const fetchAnnouncements = async () => {
    if (!user?.companyId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          author:users!announcements_created_by_fkey(name)
        `)
        .eq('company_id', user.companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted: Announcement[] = (data || []).map((a: any) => ({
        id: a.id,
        companyId: a.company_id,
        title: a.title,
        content: a.content,
        allowComments: a.allow_comments,
        createdBy: a.created_by,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
        authorName: a.author?.name || t('common.unknown'),
      }));

      setAnnouncements(formatted);
      await Promise.all(formatted.map((a) => fetchComments(a.id)));
    } catch (error) {
      console.error('공지사항 로드 실패:', error);
      toast({
        title: t('announcements.loadFailed'),
        description: t('announcements.loadFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async (announcementId: string) => {
    try {
      const { data, error } = await supabase
        .from('announcement_comments')
        .select(`
          *,
          commenter:users!announcement_comments_user_id_fkey(name)
        `)
        .eq('announcement_id', announcementId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formatted: AnnouncementComment[] = (data || []).map((c: any) => ({
        id: c.id,
        announcementId: c.announcement_id,
        userId: c.user_id,
        content: c.content,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        userName: c.commenter?.name || t('common.unknown'),
      }));

      setComments((prev) => ({
        ...prev,
        [announcementId]: formatted,
      }));
    } catch (error) {
      console.error('댓글 로드 실패:', error);
    }
  };

  const handleDeleteComment = async (commentId: string, announcementId: string) => {
    const confirmed = window.confirm(t('announcements.confirmDeleteComment'));
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('announcement_comments').delete().eq('id', commentId);

      if (error) throw error;

      toast({
        title: t('announcements.commentDeleted'),
        description: t('announcements.commentDeletedDesc'),
      });

      await fetchComments(announcementId);
    } catch (error) {
      console.error('댓글 삭제 실패:', error);
      toast({
        title: t('announcements.commentDeleteFailed'),
        description: t('announcements.commentDeleteFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleAdd = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast({
        title: t('announcements.inputError'),
        description: t('announcements.inputErrorDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (!user?.id || !user?.companyId) {
      toast({
        title: t('announcements.noUserInfo'),
        description: t('announcements.noUserInfoDesc'),
        variant: 'destructive',
      });
      return;
    }

    setIsAdding(true);
    try {
      const { error } = await supabase.from('announcements').insert({
        company_id: user.companyId,
        title: newTitle.trim(),
        content: newContent.trim(),
        allow_comments: newAllowComments,
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: t('announcements.addComplete'),
        description: t('announcements.addCompleteDesc'),
      });

      setAddDialogOpen(false);
      setNewTitle('');
      setNewContent('');
      setNewAllowComments(true);
      await fetchAnnouncements();
    } catch (error) {
      console.error('공지사항 추가 실패:', error);
      toast({
        title: t('announcements.addFailed'),
        description: t('announcements.addFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const openEditDialog = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setEditTitle(announcement.title);
    setEditContent(announcement.content);
    setEditAllowComments(announcement.allowComments);
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!editingId) return;

    if (!editTitle.trim() || !editContent.trim()) {
      toast({
        title: t('announcements.inputError'),
        description: t('announcements.inputErrorDesc'),
        variant: 'destructive',
      });
      return;
    }

    setIsEditing(true);
    try {
      const { error } = await supabase
        .from('announcements')
        .update({
          title: editTitle.trim(),
          content: editContent.trim(),
          allow_comments: editAllowComments,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId);

      if (error) throw error;

      toast({
        title: t('announcements.editComplete'),
        description: t('announcements.editCompleteDesc'),
      });

      setEditDialogOpen(false);
      await fetchAnnouncements();
    } catch (error) {
      console.error('공지사항 수정 실패:', error);
      toast({
        title: t('announcements.editFailed'),
        description: t('announcements.editFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsEditing(false);
    }
  };

  const openDeleteDialog = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', deletingId);

      if (error) throw error;

      toast({
        title: t('documentMgmt.deleteComplete'),
        description: t('announcements.deleteCompleteDesc'),
      });

      setDeleteDialogOpen(false);
      await fetchAnnouncements();
    } catch (error) {
      console.error('공지사항 삭제 실패:', error);
      toast({
        title: t('documentMgmt.deleteFailed'),
        description: t('announcements.deleteFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton className="mb-4" />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t('announcements.title')}</h1>
            <p className="text-slate-500 mt-1">{t('announcements.subtitle')}</p>
          </div>

          {/* 데스크톱: 헤더 옆에 표시 */}
          <Button 
            className="hidden md:flex bg-blue-600 hover:bg-blue-700"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('announcements.write')}
          </Button>
        </div>

        {/* 모바일: 전체 너비 버튼 */}
        <Button 
          className="md:hidden w-full bg-blue-600 hover:bg-blue-700"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('announcements.write')}
        </Button>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogContent className="max-w-2xl" closeClassName="text-white data-[state=open]:text-white">
              <DialogHeader>
                <DialogTitle>{t('announcements.addDialogTitle')}</DialogTitle>
                <DialogDescription>{t('announcements.addDialogDesc')}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('announcements.titleLabel')}</Label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder={t('announcements.titlePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('announcements.contentLabel')}</Label>
                  <Textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder={t('announcements.contentPlaceholder')}
                    rows={8}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allow-comments"
                    checked={newAllowComments}
                    onCheckedChange={(checked) => setNewAllowComments(checked === true)}
                    className="h-5 w-5 rounded-none border-black bg-white data-[state=checked]:bg-white data-[state=checked]:text-black"
                  />
                  <Label htmlFor="allow-comments">{t('announcements.allowComments')}</Label>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="button"
                  onClick={handleAdd}
                  disabled={isAdding}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isAdding ? t('announcements.adding') : t('common.add')}
                </Button>
              </DialogFooter>
          </DialogContent>
        </Dialog>

        {isLoading ? (
          <p className="text-slate-500">{t('common.loading')}</p>
        ) : announcements.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-slate-500">{t('announcements.noAnnouncements')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <CardTitle className="text-xl truncate">{announcement.title}</CardTitle>
                      <p className="text-sm text-slate-500 mt-1 truncate">
                        {t('announcements.author')}: {announcement.authorName} ·{' '}
                        {format(new Date(announcement.createdAt), 'PPP', { locale: ko })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEditDialog(announcement)}
                      >
                        <img src={penIcon} alt={t('common.edit')} className="w-full h-full p-1.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-red-500 hover:text-red-600 border-gray-200 hover:border-red-500"
                        onClick={() => openDeleteDialog(announcement.id)}
                      >
                        <img src={binIcon} alt={t('common.delete')} className="w-full h-full p-1.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 whitespace-pre-wrap">{announcement.content}</p>
                  <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      {t('announcements.commentsCount', { count: comments[announcement.id]?.length || 0 })} {announcement.allowComments ? '' : `(${t('announcements.commentsDisabled')})`}
                    </div>
                  </div>

                  {/* 댓글 목록 */}
                  {comments[announcement.id] && comments[announcement.id].length > 0 && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <p className="text-sm font-medium text-slate-700">{t('announcements.commentList')}</p>
                      {comments[announcement.id].map((comment) => (
                        <div key={comment.id} className="bg-slate-50 rounded-lg p-3 flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-700">{comment.userName}</p>
                            <p className="text-sm text-slate-600 mt-1">{comment.content}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              {format(new Date(comment.createdAt), 'PPp', { locale: ko })}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-red-500 hover:text-red-600 border-gray-200 hover:border-red-500"
                            onClick={() => handleDeleteComment(comment.id, announcement.id)}
                          >
                            <img src={binIcon} alt={t('common.delete')} className="w-full h-full p-1.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl" closeClassName="text-white data-[state=open]:text-white">
            <DialogHeader>
              <DialogTitle>{t('announcements.editDialogTitle')}</DialogTitle>
              <DialogDescription>{t('announcements.editDialogDesc')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('announcements.titleLabel')}</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder={t('announcements.titlePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('announcements.contentLabel')}</Label>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder={t('announcements.contentPlaceholder')}
                  rows={8}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-allow-comments"
                  checked={editAllowComments}
                  onCheckedChange={(checked) => setEditAllowComments(checked === true)}
                  className="h-5 w-5 rounded-none border-black bg-white data-[state=checked]:bg-white data-[state=checked]:text-black"
                />
                <Label htmlFor="edit-allow-comments">{t('announcements.allowComments')}</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleEdit}
                disabled={isEditing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isEditing ? t('common.processing') : t('common.confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('announcements.deleteDialogTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('announcements.deleteConfirmMsg')}
                <br />
                {t('announcements.deleteWarning')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? t('documentMgmt.deleting') : t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
