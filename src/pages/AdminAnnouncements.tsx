import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, MessageSquare, Megaphone } from 'lucide-react';
import penIcon from '@/assets/pen.svg';
import binIcon from '@/assets/bin.svg';
import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { v1Card, V1PageHeader, V1CardHeader } from '@/components/ui/v1-components';
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

  const totalComments = useMemo(() =>
    Object.values(comments).reduce((sum, arr) => sum + arr.length, 0)
  , [comments]);

  const recentComments = useMemo(() => {
    const all = Object.values(comments).flat();
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4);
  }, [comments]);

return (
  <DashboardLayout>
    <div className="space-y-6">
      <BackButton className="mb-4" />

      <V1PageHeader
        title={t('announcements.title')}
        sub={t('announcements.subtitle')}
        right={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-[10px] border-[#e5e7eb] text-slate-700 text-[13px] font-semibold md:hidden"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {t('announcements.write')}
            </Button>
            <Button
              className="hidden md:flex h-9 text-[13px] font-semibold"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {t('announcements.write')}
            </Button>
          </div>
        }
      />

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
                <Button type="button" variant="outline" className="rounded-[10px] h-9" onClick={() => setAddDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="button"
                  onClick={handleAdd}
                  disabled={isAdding}
                  className="h-9"
                >
                  {isAdding ? t('announcements.adding') : t('common.add')}
                </Button>
              </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── V1 2-Column Layout ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Left: Announcement List */}
          <div className={v1Card}>
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="h-[18px] w-[18px] text-[#2563eb]" />
                <h2 className="text-base font-semibold text-slate-900">{t('announcements.allAnnouncements', { defaultValue: '전체 공지' })}</h2>
                <span className="text-xs font-semibold text-[#1e40af] bg-[#eff6ff] px-2 py-0.5 rounded-full">{announcements.length}</span>
              </div>
            </div>

            {isLoading ? (
              <div className="p-12 text-center"><p className="text-slate-500">{t('common.loading')}</p></div>
            ) : announcements.length === 0 ? (
              <div className="p-12 text-center"><p className="text-slate-500">{t('announcements.noAnnouncements')}</p></div>
            ) : (
              <div>
                {announcements.map((announcement, idx) => (
                  <article
                    key={announcement.id}
                    className={`px-5 sm:px-6 py-5 flex flex-col gap-2 relative ${
                      idx < announcements.length - 1 ? 'border-b border-slate-100' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-slate-900 tracking-tight flex-1 min-w-0 truncate">{announcement.title}</h3>
                      <div className="flex gap-1.5 shrink-0">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => openEditDialog(announcement)}>
                          <img src={penIcon} alt={t('common.edit')} className="w-full h-full p-1" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 border-gray-200 hover:border-red-500" onClick={() => openDeleteDialog(announcement.id)}>
                          <img src={binIcon} alt={t('common.delete')} className="w-full h-full p-1" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-[13px] text-slate-500 leading-relaxed line-clamp-2">{announcement.content}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-[18px] h-[18px] rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-white flex items-center justify-center font-bold text-[9px]">{announcement.authorName?.[0]}</span>
                        {announcement.authorName}
                      </span>
                      <span className="font-mono">{format(new Date(announcement.createdAt), 'yyyy-MM-dd')}</span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {comments[announcement.id]?.length || 0}
                      </span>
                    </div>

                    {/* 댓글 목록 */}
                    {comments[announcement.id] && comments[announcement.id].length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                        <p className="text-xs font-medium text-slate-500">{t('announcements.commentList')}</p>
                        {comments[announcement.id].map((comment) => (
                          <div key={comment.id} className="bg-slate-50 rounded-lg p-3 flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-700">{comment.userName}</p>
                              <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{comment.content}</p>
                              <p className="text-[10px] text-slate-400 mt-1">
                                {format(new Date(comment.createdAt), 'PPp', { locale: ko })}
                              </p>
                            </div>
                            <Button variant="outline" size="icon" className="h-6 w-6 shrink-0 text-red-500 hover:text-red-600 border-gray-200 hover:border-red-500" onClick={() => handleDeleteComment(comment.id, announcement.id)}>
                              <img src={binIcon} alt={t('common.delete')} className="w-full h-full p-0.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Right: Stats + Recent Comments Sidebar */}
          <div className="flex flex-col gap-4">
            {/* Monthly Stats */}
            <div className={v1Card}>
              <V1CardHeader title={t('announcements.monthlyStats', { defaultValue: '이번 달 통계' })} icon={Megaphone} iconColor="#2563eb" />
              <div className="px-5 py-3 flex flex-col gap-3">
                {[
                  [t('announcements.writtenAnnouncements', { defaultValue: '작성된 공지' }), announcements.length, '#2563eb'],
                  [t('announcements.totalComments', { defaultValue: '댓글' }), totalComments, '#8b5cf6'],
                ].map(([label, value, color], i) => (
                  <div key={i} className={`flex justify-between items-center py-2 ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                    <span className="text-[12.5px] text-slate-500">{label as string}</span>
                    <span className="text-base font-bold tabular-nums" style={{ color: color as string }}>{value as number}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Comments */}
            <div className={v1Card}>
              <V1CardHeader title={t('announcements.recentComments', { defaultValue: '최근 댓글' })} icon={MessageSquare} iconColor="#2563eb" />
              <div>
                {recentComments.length === 0 ? (
                  <div className="px-5 py-6 text-center text-xs text-slate-400">{t('announcements.noComments', { defaultValue: '댓글이 없습니다.' })}</div>
                ) : recentComments.map((c, i) => (
                  <div key={c.id} className={`px-5 py-3 ${i > 0 ? 'border-t border-slate-50' : ''}`}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[12.5px] font-semibold text-slate-900">{c.userName}</span>
                      <span className="text-[11px] text-slate-400">{formatDistanceToNow(new Date(c.createdAt), { locale: ko, addSuffix: true })}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{c.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

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
              <Button type="button" variant="outline" className="rounded-[10px] h-9" onClick={() => setEditDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleEdit}
                disabled={isEditing}
                className="h-9"
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
