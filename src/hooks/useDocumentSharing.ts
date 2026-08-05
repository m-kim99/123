import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import { useDocumentStore } from '@/store/documentStore';
import { useAuthStore } from '@/store/authStore';

export interface ShareableUser {
  id: string;
  name: string;
  email: string;
}

export interface ExistingShare {
  id: string;
  shared_to_user_id: string;
  shared_at: string;
  permission: string;
  users: ShareableUser | null;
}

interface Options {
  /** 분석 이벤트에 남길 화면 구분 (예: 'category_detail') */
  context: string;
  /** 공유 알림 메일에 넣을 문서 제목. 페이지마다 문서 목록이 달라 콜백으로 받는다. */
  getDocumentTitle: (documentId: string) => string | undefined;
}

/**
 * 문서 공유 다이얼로그 공통 로직 (공유 대상 선택 · 공유 현황 · 공유 취소).
 *
 * CategoryDetail / SubcategoryDetail / DocumentManagement 가 같은 6개 핸들러와
 * 13개 상태를 각자 들고 있었고, 이미 서로 어긋나 있었다:
 *  - SubcategoryDetail 에만 document_share_send 분석 이벤트가 빠져 있었다
 *  - DocumentManagement 만 senderName 폴백이 하드코딩 한국어였다('알 수 없음')
 *  - 같은 문구를 emailSentToo / emailAlsoSent 두 키로 나눠 쓰고 있었다
 * 통합하면서 위 셋을 맞춘다.
 *
 * 권한 검사는 페이지마다 방식이 달라(문서별 검사 / 화면 단위 검사 / 없음)
 * 여기서 통일하지 않는다. 필요한 페이지가 이 훅을 호출하기 전에 막는다.
 */
export function useDocumentSharing({ context, getDocumentTitle }: Options) {
  const { t } = useTranslation();
  const { shareDocument, unshareDocument } = useDocumentStore();
  const user = useAuthStore((state) => state.user);

  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharingDocumentId, setSharingDocumentId] = useState<string | null>(null);
  const [companyUsers, setCompanyUsers] = useState<ShareableUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSendingShare, setIsSendingShare] = useState(false);
  const [sendEmailNotification, setSendEmailNotification] = useState(false);
  const [activeShareTab, setActiveShareTab] = useState<'new' | 'existing'>('new');
  const [existingShares, setExistingShares] = useState<ExistingShare[]>([]);
  const [isLoadingShares, setIsLoadingShares] = useState(false);

  const [unshareDialogOpen, setUnshareDialogOpen] = useState(false);
  const [unshareId, setUnshareId] = useState<string | null>(null);
  const [isUnsharing, setIsUnsharing] = useState(false);

  const openShareDialog = useCallback(
    async (documentId: string) => {
      trackEvent('share_dialog_open', { document_id: documentId, share_context: context });

      setSharingDocumentId(documentId);
      setSelectedUserIds([]);
      setActiveShareTab('new');
      setShareDialogOpen(true);
      setIsLoadingUsers(true);
      setIsLoadingShares(true);

      try {
        if (!user?.companyId) {
          throw new Error('회사 정보가 없습니다.');
        }

        // 1. 공유 가능한 사용자 목록
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('company_id', user.companyId)
          .neq('id', user.id)
          .order('name');

        if (usersError) throw usersError;
        setCompanyUsers(usersData || []);

        // 2. 현재 공유 현황 (FK JOIN 대신 별도 쿼리)
        const { data: sharesData, error: sharesError } = await supabase
          .from('shared_documents')
          .select('id, shared_to_user_id, shared_at, permission')
          .eq('document_id', documentId)
          .eq('shared_by_user_id', user.id)
          .eq('is_active', true)
          .order('shared_at', { ascending: false });

        if (sharesError) throw sharesError;

        // 3. 공유받은 사용자 정보 조회
        if (sharesData && sharesData.length > 0) {
          const sharedToUserIds = [...new Set(sharesData.map((s) => s.shared_to_user_id))];
          const { data: sharedUsersData } = await supabase
            .from('users')
            .select('id, name, email')
            .in('id', sharedToUserIds);

          const usersMap = new Map((sharedUsersData || []).map((u) => [u.id, u]));
          setExistingShares(
            sharesData.map((share) => ({
              ...share,
              users: usersMap.get(share.shared_to_user_id) || null,
            })),
          );
        } else {
          setExistingShares([]);
        }
      } catch (error) {
        console.error('공유 정보 로드 실패:', error);
        toast({
          title: t('documentMgmt.shareLoadFailed'),
          description: t('documentMgmt.shareLoadFailedDesc'),
          variant: 'destructive',
        });
      } finally {
        setIsLoadingUsers(false);
        setIsLoadingShares(false);
      }
    },
    [context, t, user?.companyId, user?.id],
  );

  /** 공유 취소 확인 다이얼로그를 연다 (실제 취소는 confirmUnshare). */
  const requestUnshare = useCallback((shareId: string) => {
    setUnshareId(shareId);
    setUnshareDialogOpen(true);
  }, []);

  const confirmUnshare = useCallback(async () => {
    if (!unshareId) return;

    setIsUnsharing(true);
    try {
      await unshareDocument(unshareId);
      setExistingShares((prev) => prev.filter((s) => s.id !== unshareId));

      toast({
        title: t('documentMgmt.unshareComplete'),
        description: t('documentMgmt.unshareCompleteDesc'),
      });

      setUnshareDialogOpen(false);
      setUnshareId(null);
    } catch (error) {
      console.error('공유 취소 실패:', error);
      toast({
        title: t('documentMgmt.unshareFailed'),
        description: t('documentMgmt.unshareFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsUnsharing(false);
    }
  }, [t, unshareDocument, unshareId]);

  const toggleUser = useCallback((userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }, []);

  const selectAllUsers = useCallback(() => {
    setSelectedUserIds((prev) =>
      prev.length === companyUsers.length ? [] : companyUsers.map((u) => u.id),
    );
  }, [companyUsers]);

  const sendShare = useCallback(async () => {
    if (!sharingDocumentId || selectedUserIds.length === 0) {
      toast({
        title: t('documentMgmt.selectionError'),
        description: t('documentMgmt.selectUsersToShare'),
        variant: 'destructive',
      });
      return;
    }

    trackEvent('document_share_send', {
      document_id: sharingDocumentId,
      recipient_count: selectedUserIds.length,
      send_email_notification: sendEmailNotification,
      share_context: context,
    });

    setIsSendingShare(true);

    try {
      const documentTitle = getDocumentTitle(sharingDocumentId);
      if (!documentTitle) {
        throw new Error('문서를 찾을 수 없습니다.');
      }

      // 1. DB에 공유 정보 저장 (필수)
      for (const userId of selectedUserIds) {
        await shareDocument(sharingDocumentId, userId, 'download', undefined);
      }

      // 2. 이메일 전송 (선택사항, 실패해도 공유는 성공으로 처리)
      // 메일에는 파일 URL을 넣지 않는다 — send-share-email 은 앱의 공유함 링크만 보낸다.
      if (sendEmailNotification) {
        const recipientEmails = companyUsers
          .filter((u) => selectedUserIds.includes(u.id))
          .map((u) => u.email);

        try {
          await supabase.functions.invoke('send-share-email', {
            body: {
              recipientEmails,
              documentTitle,
              senderName: user?.name || t('common.unknown'),
              senderEmail: user?.email || '',
            },
          });
        } catch (emailError) {
          console.warn('이메일 전송 실패 (공유는 완료됨):', emailError);
        }
      }

      toast({
        title: t('documentMgmt.shareComplete'),
        description:
          t('documentMgmt.shareCompleteDesc', { count: selectedUserIds.length }) +
          (sendEmailNotification ? ` ${t('documentMgmt.emailSentToo')}` : ''),
      });

      setShareDialogOpen(false);
      setSharingDocumentId(null);
      setSelectedUserIds([]);
      setSendEmailNotification(false);
    } catch (error) {
      console.error('문서 공유 실패:', error);
      toast({
        title: t('documentMgmt.shareFailed'),
        description: t('documentMgmt.shareFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsSendingShare(false);
    }
  }, [
    companyUsers,
    context,
    getDocumentTitle,
    selectedUserIds,
    sendEmailNotification,
    shareDocument,
    sharingDocumentId,
    t,
    user?.email,
    user?.name,
  ]);

  return {
    shareDialogOpen,
    setShareDialogOpen,
    sharingDocumentId,
    setSharingDocumentId,
    companyUsers,
    selectedUserIds,
    setSelectedUserIds,
    isLoadingUsers,
    isSendingShare,
    sendEmailNotification,
    setSendEmailNotification,
    activeShareTab,
    setActiveShareTab,
    existingShares,
    isLoadingShares,
    unshareDialogOpen,
    setUnshareDialogOpen,
    unshareId,
    setUnshareId,
    isUnsharing,
    openShareDialog,
    requestUnshare,
    confirmUnshare,
    toggleUser,
    selectAllUsers,
    sendShare,
  };
}
