import { useEffect, useState } from 'react';
import { MessageSquare, Send, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/hooks/use-toast';
import type { Announcement, AnnouncementComment } from '@/types/announcement';

export function TeamAnnouncements() {
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
        authorName: a.author?.name || '알 수 없음',
      }));

      setAnnouncements(formatted);
      await Promise.all(formatted.map((a) => fetchComments(a.id)));
    } catch (error) {
      console.error('공지사항 로드 실패:', error);
      toast({
        title: '로드 실패',
        description: '공지사항을 불러오지 못했습니다.',
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
        userName: c.commenter?.name || '알 수 없음',
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
        title: '입력 오류',
        description: '댓글 내용을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: '사용자 정보 없음',
        description: '사용자 정보를 불러오지 못했습니다. 다시 로그인해주세요.',
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
        title: '댓글 추가',
        description: '댓글이 추가되었습니다.',
      });

      setNewComment((prev) => ({ ...prev, [announcementId]: '' }));
      await fetchComments(announcementId);
    } catch (error) {
      console.error('댓글 추가 실패:', error);
      toast({
        title: '댓글 추가 실패',
        description: '댓글을 추가하지 못했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleEditComment = async (commentId: string, announcementId: string) => {
    if (!editingCommentContent.trim()) {
      toast({
        title: '입력 오류',
        description: '댓글 내용을 입력해주세요.',
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
        title: '댓글 수정',
        description: '댓글이 수정되었습니다.',
      });

      setEditingCommentId(null);
      setEditingCommentContent('');
      await fetchComments(announcementId);
    } catch (error) {
      console.error('댓글 수정 실패:', error);
      toast({
        title: '댓글 수정 실패',
        description: '댓글을 수정하지 못했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteComment = async (commentId: string, announcementId: string) => {
    const confirmed = window.confirm('정말 이 댓글을 삭제하시겠습니까?');
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('announcement_comments').delete().eq('id', commentId);

      if (error) throw error;

      toast({
        title: '댓글 삭제',
        description: '댓글이 삭제되었습니다.',
      });

      await fetchComments(announcementId);
    } catch (error) {
      console.error('댓글 삭제 실패:', error);
      toast({
        title: '댓글 삭제 실패',
        description: '댓글을 삭제하지 못했습니다.',
        variant: 'destructive',
      });
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">공지사항</h1>
          <p className="text-slate-500 mt-1">회사 공지사항을 확인합니다</p>
        </div>

        {isLoading ? (
          <p className="text-slate-500">로딩 중...</p>
        ) : announcements.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-slate-500">등록된 공지사항이 없습니다</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id}>
                <CardHeader>
                  <CardTitle className="text-xl">{announcement.title}</CardTitle>
                  <p className="text-sm text-slate-500">
                    작성자: {announcement.authorName} ·{' '}
                    {format(new Date(announcement.createdAt), 'PPP', { locale: ko })}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 whitespace-pre-wrap mb-4">{announcement.content}</p>

                  {announcement.allowComments && (
                    <div className="mt-6 pt-6 border-t">
                      <div className="flex items-center gap-2 mb-4">
                        <MessageSquare className="h-5 w-5 text-slate-500" />
                        <span className="font-medium text-slate-700">
                          댓글 {comments[announcement.id]?.length || 0}개
                        </span>
                      </div>

                      <div className="space-y-3 mb-4">
                        {comments[announcement.id]?.map((comment) => (
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
                                    저장
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingCommentId(null);
                                      setEditingCommentContent('');
                                    }}
                                  >
                                    취소
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-slate-700">{comment.userName}</p>
                                  <p className="text-sm text-slate-600 mt-1">{comment.content}</p>
                                  <p className="text-xs text-slate-400 mt-1">
                                    {format(new Date(comment.createdAt), 'PPp', { locale: ko })}
                                  </p>
                                </div>
                                {(comment.userId === user?.id || isAdmin) && (
                                  <div className="flex gap-1">
                                    {comment.userId === user?.id && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setEditingCommentId(comment.id);
                                          setEditingCommentContent(comment.content);
                                        }}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteComment(comment.id, announcement.id)}
                                    >
                                      <Trash2 className="h-3 w-3 text-red-600" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Textarea
                          value={newComment[announcement.id] || ''}
                          onChange={(e) =>
                            setNewComment((prev) => ({
                              ...prev,
                              [announcement.id]: e.target.value,
                            }))
                          }
                          placeholder="댓글을 입력하세요..."
                          rows={2}
                        />
                        <Button
                          onClick={() => handleAddComment(announcement.id)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
