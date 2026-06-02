import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Send, Megaphone } from 'lucide-react';
import penIcon from '@/assets/icons/pen.svg';
import binIcon from '@/assets/icons/bin.svg';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { v1Card, V1PageHeader } from '@/components/ui/v1-components';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/hooks/use-toast';
import type { Announcement, AnnouncementComment } from '@/types/announcement';
import { BackButton } from '@/components/BackButton';

export function TeamAnnouncements() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [comments, setComments] = useState<Record<string, AnnouncementComment[]>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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

  const handleAddComment = async (announcementId: string) => {
    const content = newComment[announcementId]?.trim();
    if (!content) {
      toast({
        title: t('announcements.inputError'),
        description: t('teamAnnouncements.enterComment'),
        variant: 'destructive',
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: t('announcements.noUserInfo'),
        description: t('announcements.noUserInfoDesc'),
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.from('announcement_comments').insert({
        announcement_id: announcementId,
        user_id: user.id,
        content,
      });

      if (error) throw error;

      toast({
        title: t('teamAnnouncements.commentAdded'),
        description: t('teamAnnouncements.commentAddedDesc'),
      });

      setNewComment((prev) => ({ ...prev, [announcementId]: '' }));
      await fetchComments(announcementId);
    } catch (error) {
      console.error('댓글 추가 실패:', error);
      toast({
        title: t('teamAnnouncements.commentAddFailed'),
        description: t('teamAnnouncements.commentAddFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleEditComment = async (commentId: string, announcementId: string) => {
    if (!editingCommentContent.trim()) {
      toast({
        title: t('announcements.inputError'),
        description: t('teamAnnouncements.enterComment'),
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('announcement_comments')
        .update({
          content: editingCommentContent.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId);

      if (error) throw error;

      toast({
        title: t('teamAnnouncements.commentEdited'),
        description: t('teamAnnouncements.commentEditedDesc'),
      });

      setEditingCommentId(null);
      setEditingCommentContent('');
      await fetchComments(announcementId);
    } catch (error) {
      console.error('댓글 수정 실패:', error);
      toast({
        title: t('teamAnnouncements.commentEditFailed'),
        description: t('teamAnnouncements.commentEditFailedDesc'),
        variant: 'destructive',
      });
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

  const isAdmin = user?.role === 'admin';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <BackButton className="mb-4" />

        <V1PageHeader
          title={t('teamAnnouncements.title')}
          sub={t('teamAnnouncements.subtitle')}
        />

        {/* V1 Card */}
        <div className={v1Card}>
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Megaphone className="h-[18px] w-[18px] text-[#1e40af]" />
            <h2 className="text-base font-semibold text-slate-900">{t('announcements.allAnnouncements', { defaultValue: '전체 공지' })}</h2>
            <span className="text-xs font-semibold text-[#1e40af] bg-[#eff6ff] px-2 py-0.5 rounded-full">{announcements.length}</span>
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
                  className={`px-5 sm:px-6 py-5 flex flex-col gap-2 ${
                    idx < announcements.length - 1 ? 'border-b border-slate-100' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-slate-900 tracking-tight flex-1 min-w-0 truncate">{announcement.title}</h3>
                  </div>
                  <p className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap">{announcement.content}</p>
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

                  {/* 댓글 섹션 */}
                  {announcement.allowComments && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      {comments[announcement.id] && comments[announcement.id].length > 0 && (
                        <div className="space-y-2 mb-3">
                          <p className="text-xs font-medium text-slate-500">{t('announcements.commentList')}</p>
                          {comments[announcement.id].map((comment) => (
                            <div key={comment.id} className="bg-slate-50 rounded-lg p-3">
                              {editingCommentId === comment.id ? (
                                <div className="space-y-2">
                                  <Textarea
                                    value={editingCommentContent}
                                    onChange={(e) => setEditingCommentContent(e.target.value)}
                                    rows={2}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleEditComment(comment.id, announcement.id)}
                                    >
                                      {t('common.save')}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 rounded-[8px]"
                                      onClick={() => {
                                        setEditingCommentId(null);
                                        setEditingCommentContent('');
                                      }}
                                    >
                                      {t('common.cancel')}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-700">{comment.userName}</p>
                                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{comment.content}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                      {format(new Date(comment.createdAt), 'PPp', { locale: ko })}
                                    </p>
                                  </div>
                                  {(comment.userId === user?.id || isAdmin) && (
                                    <div className="flex gap-1 shrink-0">
                                      {comment.userId === user?.id && (
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => {
                                            setEditingCommentId(comment.id);
                                            setEditingCommentContent(comment.content);
                                          }}
                                        >
                                          <img src={penIcon} alt={t('common.edit')} className="w-full h-full p-0.5" />
                                        </Button>
                                      )}
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-6 w-6 text-red-500 hover:text-red-600 border-gray-200 hover:border-red-500"
                                        onClick={() => handleDeleteComment(comment.id, announcement.id)}
                                      >
                                        <img src={binIcon} alt={t('common.delete')} className="w-full h-full p-0.5" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 댓글 입력 */}
                      <div className="flex gap-2">
                        <Textarea
                          className="flex-1 text-[13px]"
                          value={newComment[announcement.id] || ''}
                          onChange={(e) =>
                            setNewComment((prev) => ({
                              ...prev,
                              [announcement.id]: e.target.value,
                            }))
                          }
                          placeholder={t('teamAnnouncements.commentPlaceholder')}
                          rows={2}
                        />
                        <Button
                          onClick={() => handleAddComment(announcement.id)}
                          className="h-auto px-4"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
