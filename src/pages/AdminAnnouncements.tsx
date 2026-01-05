import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, MessageSquare } from 'lucide-react';
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
  DialogTrigger,
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

export function AdminAnnouncements() {
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

  const handleAdd = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast({
        title: '입력 오류',
        description: '제목과 내용을 모두 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.id || !user?.companyId) {
      toast({
        title: '사용자 정보 없음',
        description: '사용자 정보를 불러오지 못했습니다. 다시 로그인해주세요.',
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
        title: '추가 완료',
        description: '공지사항이 추가되었습니다.',
      });

      setAddDialogOpen(false);
      setNewTitle('');
      setNewContent('');
      setNewAllowComments(true);
      await fetchAnnouncements();
    } catch (error) {
      console.error('공지사항 추가 실패:', error);
      toast({
        title: '추가 실패',
        description: '공지사항을 추가하지 못했습니다.',
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
        title: '입력 오류',
        description: '제목과 내용을 모두 입력해주세요.',
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
        title: '수정 완료',
        description: '공지사항이 수정되었습니다.',
      });

      setEditDialogOpen(false);
      await fetchAnnouncements();
    } catch (error) {
      console.error('공지사항 수정 실패:', error);
      toast({
        title: '수정 실패',
        description: '공지사항을 수정하지 못했습니다.',
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
        title: '삭제 완료',
        description: '공지사항이 삭제되었습니다.',
      });

      setDeleteDialogOpen(false);
      await fetchAnnouncements();
    } catch (error) {
      console.error('공지사항 삭제 실패:', error);
      toast({
        title: '삭제 실패',
        description: '공지사항을 삭제하지 못했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">공지사항 관리</h1>
            <p className="text-slate-500 mt-1">회사 공지사항을 작성하고 관리합니다</p>
          </div>

          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                새 공지사항
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" closeClassName="text-white data-[state=open]:text-white">
              <DialogHeader>
                <DialogTitle>새 공지사항 작성</DialogTitle>
                <DialogDescription>회사 전체에 공지할 내용을 작성합니다</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>제목</Label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="공지사항 제목을 입력하세요"
                  />
                </div>
                <div className="space-y-2">
                  <Label>내용</Label>
                  <Textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="공지사항 내용을 입력하세요"
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
                  <Label htmlFor="allow-comments">댓글 허용</Label>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                  취소
                </Button>
                <Button
                  type="button"
                  onClick={handleAdd}
                  disabled={isAdding}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isAdding ? '추가 중...' : '추가'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{announcement.title}</CardTitle>
                      <p className="text-sm text-slate-500 mt-1">
                        작성자: {announcement.authorName} ·{' '}
                        {format(new Date(announcement.createdAt), 'PPP', { locale: ko })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white hover:bg-slate-50"
                        onClick={() => openEditDialog(announcement)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white hover:bg-slate-50"
                        onClick={() => openDeleteDialog(announcement.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 whitespace-pre-wrap">{announcement.content}</p>
                  <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      댓글 {comments[announcement.id]?.length || 0}개 {announcement.allowComments ? '' : '(댓글 비허용)'}
                    </div>
                  </div>

                  {/* 댓글 목록 */}
                  {comments[announcement.id] && comments[announcement.id].length > 0 && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <p className="text-sm font-medium text-slate-700">댓글 목록</p>
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
                            size="sm"
                            className="bg-white hover:bg-slate-50"
                            onClick={() => handleDeleteComment(comment.id, announcement.id)}
                          >
                            <Trash2 className="h-3 w-3 text-red-600" />
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
              <DialogTitle>공지사항 수정</DialogTitle>
              <DialogDescription>공지사항 내용을 수정합니다</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>제목</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="공지사항 제목을 입력하세요"
                />
              </div>
              <div className="space-y-2">
                <Label>내용</Label>
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="공지사항 내용을 입력하세요"
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
                <Label htmlFor="edit-allow-comments">댓글 허용</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                취소
              </Button>
              <Button
                type="button"
                onClick={handleEdit}
                disabled={isEditing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isEditing ? '저장 중...' : '저장'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>공지사항 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                정말 이 공지사항을 삭제하시겠습니까?
                <br />
                삭제 시 모든 댓글도 함께 삭제되며, 되돌릴 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
