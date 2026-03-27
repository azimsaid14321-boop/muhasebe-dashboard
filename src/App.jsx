import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import {
  Clock, ShieldCheck, ChevronRight, Play, ChevronDown, PanelLeftClose, PanelLeftOpen,
  LayoutDashboard, FileText, History, DollarSign, Zap, Settings, LogOut, UploadCloud,
  Mail, Lock, ArrowLeft, Check, Plus, Sparkles, Trash2, Search, Download, Activity, ToggleLeft, ToggleRight, Loader2, ChevronRight as Next, RefreshCcw,
  List, Eye, FileSignature, X, Menu, Upload
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from './lib/supabaseClient';
import LandingPage from './LandingPage';

function Dashboard() {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [reportName, setReportName] = useState('');
  const [extractionFields, setExtractionFields] = useState([
    { id: 1, name: 'Tarih', active: true, isCustom: false },
    { id: 2, name: 'Fiş No', active: true, isCustom: false },
    { id: 3, name: 'Firma Adı', active: true, isCustom: false },
    { id: 4, name: 'KDV Oranları', active: true, isCustom: false },
    { id: 5, name: 'Toplam Tutar', active: true, isCustom: false },
    { id: 6, name: 'Açıklama', active: true, isCustom: false },
    { id: 7, name: 'İsim', active: true, isCustom: false },
  ]);

  const toggleField = (id) => {
    setExtractionFields(fields => fields.map(f => f.id === id ? { ...f, active: !f.active } : f));
  };

  const addCustomField = () => {
    setExtractionFields([...extractionFields, { id: Date.now(), name: '', active: true, isCustom: true }]);
  };

  const updateCustomFieldName = (id, newName) => {
    setExtractionFields(fields => fields.map(f => f.id === id ? { ...f, name: newName } : f));
  };

  const removeField = (id) => {
    setExtractionFields(fields => fields.filter(f => f.id !== id));
  };

  const [activeTab, setActiveTab] = useState('z-raporlari');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoDownload, setAutoDownload] = useState(true);
  const [notifyEnd, setNotifyEnd] = useState(false);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({ toplamEvrak: 0, tasarrufZamani: '0 Dakika' });
  const [recentActivities, setRecentActivities] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (activeTab === 'panel') {
      fetchDashboardData();
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const currentUser = userData?.user;

      if (userError || !currentUser) return;

      // 1. Toplam Evrak ve Tasarruf Zamanı
      const { count, error: countError } = await supabase
        .from('evrak_islemleri')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id);

      if (!countError) {
        const evrakSayisi = count || 0;
        const totalMinutes = evrakSayisi * 1; // Her evrak 1 dakika

        let tasarrufText = `${totalMinutes} Dakika`;
        if (totalMinutes >= 60) {
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          tasarrufText = minutes > 0 ? `${hours} Saat ${minutes} Dakika` : `${hours} Saat`;
        }

        setDashboardStats({
          toplamEvrak: evrakSayisi,
          tasarrufZamani: tasarrufText
        });
      }

      // 2. Son Aktiviteler (Son 5 Kayıt - Geçmiş Raporlar Mantığı)
      const { data: recentReports, error: reportsError } = await supabase.storage
        .from('raporlar')
        .list(currentUser.id, {
          limit: 5,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (!reportsError && recentReports) {
        // Boş ghost dosyaları filtrele ve SADECE .xlsx uzantılı dosyaları al ('Geçmiş Raporlar Çöplüğü' onarımı)
        const validRecent = recentReports.filter(f => f.name && f.name !== '.emptyFolderPlaceholder' && f.name.toLowerCase().includes('.xlsx'));
        setRecentActivities(validRecent);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const filteredVeriler = reports.filter(item =>
    item.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState({ text: '', type: '', visible: false });
  const [failedWebhooks, setFailedWebhooks] = useState([]);

  // İşlem Listesi ve Modal Durumları
  const [islemListesi, setIslemListesi] = useState([]);
  const [sessionBatchIds, setSessionBatchIds] = useState([]);
  const [loadingIslem, setLoadingIslem] = useState(false);
  const [selectedModalItem, setSelectedModalItem] = useState(null);
  const [modalFormData, setModalFormData] = useState({});
  const [isModalSaving, setIsModalSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const reportNameInputRef = useRef(null);

  // Upload-Review Queue Modal State
  const [uploadQueue, setUploadQueue] = useState([]);          // [{recordId, fileUrl, fileName, previewUrl, status, isTimeoutError: boolean}]
  const [uploadQueueIndex, setUploadQueueIndex] = useState(0); // hangi evrak gösteriliyor
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadModalFormData, setUploadModalFormData] = useState({});
  const [isUploadModalSaving, setIsUploadModalSaving] = useState(false);

  // ─── Smart Magnifier (Akıllı Büyüteç) ──────────────────────────────────
  const imgContainerRef = useRef(null);
  const [imgZoom, setImgZoom] = useState({ hovered: false, originX: '50%', originY: '50%' });

  const showToast = useCallback((text, type = 'success') => {
    setToastMessage({ text, type, visible: true });
    setTimeout(() => {
      setToastMessage(prev => ({ ...prev, visible: false }));
    }, 4000);
  }, []);

  const handleFileSelect = (files) => {
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      if (fileArray.length > 30) {
        showToast('En fazla 30 dosya yükleyebilirsiniz. Sadece ilk 30 dosya eklendi.', 'error');
      }
      const limitedFiles = fileArray.slice(0, 30);
      setSelectedFiles(limitedFiles);
    }
  };

  useEffect(() => {
    if (activeTab === 'gecmis-raporlar') {
      fetchReports();
    }
  }, [activeTab]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('requested_metrics');
    if (saved) {
      try {
        setExtractionFields(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse cached metrics:', e);
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('requested_metrics', JSON.stringify(extractionFields));
  }, [extractionFields]);

  const fetchIslemListesi = async () => {
    if (sessionBatchIds.length === 0) {
      setIslemListesi([]); // Liste boşken eski veriyi ekrana vurmasın
      setLoadingIslem(false);
      return;
    }
    setLoadingIslem(true);
    const { data, error } = await supabase
      .from('evrak_islemleri')
      .select('*')
      .in('id', sessionBatchIds)
      .order('created_at', { ascending: false });
    if (data && !error) {
      setIslemListesi(data);
    }
    setLoadingIslem(false);
  };

  // ─── Realtime Listener ─────────────────────────────────────────────────────
  // Her mount'ta rastgele kanal adı — eski TIMED_OUT kanalların etkisini kırar
  useEffect(() => {
    const CHANNEL_NAME = `evrak_realtime_${Date.now()}`;
    let mounted = true;

    const normalize = (s) =>
      (s || '')
        .trim()
        .toUpperCase()
        .replace(/İ/g, 'I')
        .replace(/Ş/g, 'S')
        .replace(/Ü/g, 'U')
        .replace(/Ö/g, 'O')
        .replace(/Ç/g, 'C')
        .replace(/Ğ/g, 'G');

    const channel = supabase
      .channel(CHANNEL_NAME)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'evrak_islemleri' },
        (payload) => {
          if (!mounted) return;
          const row = payload.new;
          const normStatus = normalize(row.status);

          console.log('[Realtime] UPDATE yakalandı:', {
            id: row.id,
            status: row.status,
            normStatus,
            has_extracted_data: !!row.extracted_data,
          });

          // İşlem listesini güncelle
          setIslemListesi(prev =>
            prev.map(item => item.id === row.id ? row : item)
          );

          // ONAY BEKLİYOR — Türkçe-güvenli karşılaştırma
          if (normStatus.includes('ONAY') && normStatus.includes('BEKL')) {
            console.log('[Realtime] ONAY BEKLİYOR yakalandı → uploadQueue güncelleniyor');
            const extractedData = row.extracted_data ?? row.fields ?? null;

            setUploadQueue(prev => {
              const updated = prev.map(q =>
                q.recordId === row.id
                  ? { ...q, status: row.status, extractedData }
                  : q
              );
              console.log('[Realtime] Yeni queue:', updated.map(q => ({
                id: q.recordId, status: q.status, hasData: !!q.extractedData
              })));
              return updated;
            });

            showToast(
              `${row.file_name || 'Evrak'} analizi tamamlandı — onayınızı bekliyor!`,
              'success'
            );
          }
        }
      )
      .subscribe((subStatus) => {
        console.log('[Realtime] Kanal durumu:', subStatus, '→', CHANNEL_NAME);
      });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Modal Form Doldurucu ──────────────────────────────────────────────────
  // SENKRON AKIŞ: Artık realtime ile DEĞİL, doğrudan HTTP request üzerinden veri alıyoruz.
  // Ancak fallback olarak, eğer uploadQueue güncellenirse (isReady set edilirse) bu çalışmaya devam edebilir.
  useEffect(() => {
    if (uploadQueue.length === 0) return;
    const currentItem = uploadQueue[uploadQueueIndex];
    if (!currentItem) return;

    if (currentItem.isTimeoutError) return; // Timeout hatası varsa form doldurma mantığını atla

    const normalize = (s) =>
      (s || '').trim().toUpperCase().replace(/İ/g, 'I').replace(/Ş/g, 'S');

    const normStatus = normalize(currentItem.status);
    const isReady = normStatus.includes('ONAY') && normStatus.includes('BEKL');

    // Sadece extractedData state'te güncel değilken (örneğin ilk açılışta fetch edilecekse)
    // ancak yeni senkron akışta extractedData doğrudan set edilecek.
    if (!isReady || currentItem.extractedData) return;
    if (currentItem.extractedData) {
      // extractedData hazır — formu doldur
      try {
        const parsed =
          typeof currentItem.extractedData === 'string'
            ? JSON.parse(currentItem.extractedData)
            : currentItem.extractedData;
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          console.log('[Modal Form] Form dolduruluyor:', parsed);
          setUploadModalFormData(parsed);
        } else {
          // Boş veri — aktif alanları boş değerlerle fallback et
          console.warn('[Modal Form] extractedData boş — fallback boş form oluşturuluyor');
          const fallbackForm = {};
          extractionFields.filter(f => f.active && f.name).forEach(f => { fallbackForm[f.name] = ''; });
          setUploadModalFormData(Object.keys(fallbackForm).length > 0 ? fallbackForm : { Not: '' });
        }
      } catch (e) {
        console.error('[Modal Form] Parse hatası:', e);
        const fallbackForm = {};
        extractionFields.filter(f => f.active && f.name).forEach(f => { fallbackForm[f.name] = ''; });
        setUploadModalFormData(Object.keys(fallbackForm).length > 0 ? fallbackForm : { Not: '' });
      }
    } else if (currentItem.recordId) {
      // extractedData henüz null — DB'den tek seferlik çek
      console.log("[Modal Form] extractedData null, DB'den çekiliyor...");
      supabase
        .from('evrak_islemleri')
        .select('extracted_data, fields')
        .eq('id', currentItem.recordId)
        .single()
        .then(({ data, error }) => {
          if (error) { console.error('[Modal Form] DB fetch hatası:', error); return; }
          if (data) {
            const fallback = data.extracted_data ?? data.fields ?? {};
            const parsed = typeof fallback === 'string'
              ? (fallback.trim() ? JSON.parse(fallback) : {}) : fallback;
            console.log("[Modal Form] DB'den alınan veri:", parsed);
            // Eğer veri gerçekten boşsa, aktif alanlardan fallback oluştur
            if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
              setUploadModalFormData(parsed);
            } else {
              console.warn("[Modal Form] DB'den boş veri geldi — fallback boş form oluşturuluyor");
              const fallbackForm = {};
              extractionFields.filter(f => f.active && f.name).forEach(f => { fallbackForm[f.name] = ''; });
              setUploadModalFormData(Object.keys(fallbackForm).length > 0 ? fallbackForm : { Not: '' });
            }
            setUploadQueue(prev => prev.map((q, idx) =>
              idx === uploadQueueIndex ? { ...q, extractedData: fallback } : q
            ));
          }
        });
    }
  }, [uploadQueue, uploadQueueIndex]);

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      // 1. Kullanıcıyı alıyoruz
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const currentUser = userData?.user;

      if (userError || !currentUser) {
        setReports([]);
        return;
      }

      // 2. Güvenlik filtresi: Sadece sistemdeki aktif kullanıcının kendi ID'sine ait klasörü listeliyoruz
      // Storage API olduğu için .eq('user_id', currentUser.id) yerine klasör path'ini currentUser.id olarak veriyoruz.
      const { data, error } = await supabase.storage.from('raporlar').list(currentUser.id, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });

      if (error) {
        console.error('Error fetching reports:', error);
      } else {
        // Filter out empty ghost files or folders and ONLY allow .xlsx files (Çöplük Onarımı)
        const validFiles = data?.filter(file => file.name && file.name !== '.emptyFolderPlaceholder' && file.name.toLowerCase().includes('.xlsx')) || [];
        setReports(validFiles);
      }
    } catch (err) {
      console.error('Unexpected error fetching reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleDownload = async (fileName) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData?.user;

      if (!currentUser) return;

      const filePath = `${currentUser.id}/${fileName}`;
      const { data } = supabase.storage.from('raporlar').getPublicUrl(filePath);

      if (data && data.publicUrl) {
        window.open(data.publicUrl, '_blank');
      }
    } catch (err) {
      console.error("Error generating download url:", err);
    }
  };

  const handleDrag = function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = function (e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  // ─── SENKRON WEBHOOK TETİKLEYİCİ (HTTP İstek) ───
  const triggerWebhookSync = async (recordId, fileUrl, metrics = [], fileName) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 saniye timeout (n8n işlemleri uzun sürebilir)

    try {
      console.log(`[Webhook] Senkron istek başlatılıyor... (Record ID: ${recordId})`);
      const response = await fetch('https://denemeazim10.app.n8n.cloud/webhook/analyze-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          record_id: recordId,
          file_url: fileUrl,
          requested_metrics: metrics,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 504 || response.status === 502) {
          throw new Error('TIMEOUT');
        }
        throw new Error(`Sunucu Hatası: ${response.status}`);
      }

      // n8n'den gelen veriyi doğrudan alıyoruz
      const responseData = await response.json();
      console.log("[Webhook] Başarılı (Senkron Dönüş):", responseData);

      // Veriyi Supabase'e kaydet (n8n kaydetmemişse garantiye almak için, ya da zaten n8n kaydettiği için status güncelle)
      // Ancak doğrudan uploadModalFormData'yı da set edip Onay Bekliyor konumuna getireceğiz.
      const extractedData = responseData.extracted_data || responseData;

      await supabase.from('evrak_islemleri').update({
        status: 'ONAY BEKLİYOR',
        extracted_data: extractedData
      }).eq('id', recordId);

      // İslem Listesi ve Modal Queue'yu güncelle
      setIslemListesi(prev => prev.map(it => it.id === recordId ? { ...it, status: 'ONAY BEKLİYOR', extracted_data: extractedData } : it));
      setUploadQueue(prev => prev.map(q => q.recordId === recordId ? { ...q, status: 'ONAY BEKLİYOR', extractedData, isTimeoutError: false } : q));

      // Veriyi form state'ine bas (Eğer aktif modal buysa)
      // uploadModalFormData'yı useEffect üzerinden değil, doğrudan set edebiliriz
      try {
        const parsed = typeof extractedData === 'string' ? JSON.parse(extractedData) : extractedData;
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          setUploadModalFormData(parsed);
        } else {
          const fallbackForm = {};
          metrics.forEach(f => { fallbackForm[f] = ''; });
          setUploadModalFormData(Object.keys(fallbackForm).length > 0 ? fallbackForm : { Not: '' });
        }
      } catch (e) {
        const fallbackForm = {};
        metrics.forEach(f => { fallbackForm[f] = ''; });
        setUploadModalFormData(Object.keys(fallbackForm).length > 0 ? fallbackForm : { Not: '' });
      }

      showToast(`${fileName} başarıyla analiz edildi.`, 'success');
      return { success: true, data: extractedData };

    } catch (err) {
      clearTimeout(timeoutId);

      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        console.error("%c[CORS / NETWORK HATASI]:", "color: red", err);
        showToast("Bağlantı Hatası: Tarayıcı CORS engeli veya n8n akışı kapalı (Active değil).", "error");

        await supabase.from('evrak_islemleri').update({ status: 'HATA' }).eq('id', recordId);
        setIslemListesi(prev => prev.map(it => it.id === recordId ? { ...it, status: 'HATA' } : it));
        setUploadQueue(prev => prev.map(q => q.recordId === recordId ? { ...q, status: 'HATA' } : q));
        return { success: false, isTimeout: false };
      }

      console.error(`[Webhook] Hata:`, err);

      if (err.name === 'AbortError' || err.message === 'TIMEOUT') {
        console.warn(`[Webhook] Timeout yakalandı (${fileName})`);
        // Timeout hatası durumunda çökertme, isTimeoutError true yap
        setUploadQueue(prev => prev.map(q => q.recordId === recordId ? { ...q, isTimeoutError: true } : q));
        return { success: false, isTimeout: true };
      }

      // Genel hata
      await supabase.from('evrak_islemleri').update({ status: 'HATA' }).eq('id', recordId);
      setIslemListesi(prev => prev.map(it => it.id === recordId ? { ...it, status: 'HATA' } : it));
      setUploadQueue(prev => prev.map(q => q.recordId === recordId ? { ...q, status: 'HATA' } : q));
      return { success: false, isTimeout: false };
    }
  };

  const handleManualRetry = async (failedItem) => {
    if (!failedItem.recordId || !failedItem.fileUrl) {
      showToast('Eksik evrak bilgisi, istek gönderilemiyor.', 'error');
      return;
    }

    try {
      // 1. Loading state'ini aktif et
      setFailedWebhooks(prev => prev.map(item => item.recordId === failedItem.recordId ? { ...item, isRetrying: true } : item));
      await supabase.from('evrak_islemleri').update({ status: 'İŞLENİYOR' }).eq('id', failedItem.recordId);

      // 2. n8n'e doğru parametrelerle ve senkron şekilde isteği at
      const result = await triggerWebhookSync(
        failedItem.recordId,
        failedItem.fileUrl,
        failedItem.metrics || [],
        failedItem.fileName
      );

      // 3. Başarılı ise başarısızlar listesinden çıkar
      if (result && result.success) {
        setFailedWebhooks(prev => prev.filter(item => item.recordId !== failedItem.recordId));
      } else {
        throw new Error('Senkron istek başarısız oldu.');
      }
    } catch (err) {
      console.error('[Retry] Hata:', err);
      // Hata durumunda statüyü geri HATA yap
      await supabase.from('evrak_islemleri').update({ status: 'HATA' }).eq('id', failedItem.recordId);
      showToast(`${failedItem.fileName || 'Evrak'} gönderilemedi.`, 'error');
    } finally {
      // 4. KESİN KURAL: Ne olursa olsun yükleniyor (animasyon) state'ini kapat
      setFailedWebhooks(prev => prev.map(item => item.recordId === failedItem.recordId ? { ...item, isRetrying: false } : item));
    }
  };

  const handleAnalyze = async () => {
    if (!reportName.trim()) {
      showToast('Lütfen analize başlamadan önce bir Rapor/Dosya İsmi belirleyin.', 'error');
      if (reportNameInputRef.current) reportNameInputRef.current.focus();
      return;
    }

    if (selectedFiles.length === 0) {
      showToast('Lütfen bir evrak seçin veya sürükleyip bırakın.', 'error');
      return;
    }

    // ─── GÜvenlik: MIME type ve boyut kontrolü ───
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/zip', 'application/x-zip-compressed'];
    const MAX_SIZE_MB = 10;
    for (const file of selectedFiles) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        showToast(`${file.name} desteklenmeyen bir dosya türü. (Kabul edilen: JPG, PNG, WebP, GIF, PDF)`, 'error');
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        showToast(`${file.name} dosyası ${MAX_SIZE_MB}MB sınırını aşıyor.`, 'error');
        return;
      }
    }

    setIsProcessing(true);

    try {
      const activeFields = extractionFields.filter(f => f.active).map(f => f.name);
      let successCount = 0;
      let newFailed = [];

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user?.id) {
        showToast('Oturum bilgisi bulunamadı, lütfen tekrar giriş yapın.', 'error');
        return;
      }
      const currentUser = userData.user;

      for (let i = 0; i < selectedFiles.length; i++) {
        const currentFile = selectedFiles[i];
        const fileName = currentFile.name;

        // 1. Upload to receipt_images bucket
        const filePath = `${currentUser.id}/${currentFile.name}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('receipt_images')
          .upload(filePath, currentFile, {
            cacheControl: '3600',
            upsert: true, // KESİN KURAL: Aynı dosya varsa üzerine yaz!
            contentType: currentFile.type
          });
        // 2. Public URL
        const storedPath = uploadData?.path ?? filePath;
        const { data: publicUrlData } = supabase.storage
          .from('receipt_images')
          .getPublicUrl(storedPath);

        const fileUrl = publicUrlData?.publicUrl;
        if (!fileUrl) throw new Error('Dosya URL’si alınamadı. Lütfen tekrar deneyin.');

        // 3. Insert to evrak_islemleri
        const { data: insertData, error: insertError } = await supabase
          .from('evrak_islemleri')
          .insert([{ file_url: fileUrl, status: 'pending', file_name: fileName, fields: activeFields }])
          .select()
          .single();

        if (insertError) throw new Error('Kayıt oluşturulamadı. Lütfen tekrar deneyin.');

        const recordId = insertData.id;

        // Yeni yüklenenleri current session batch'e ekle
        setSessionBatchIds(prev => [recordId, ...prev]);

        // ─── OPTİMİSTİK GÜNCELLEME: satırı anında listeye ekle ───
        setIslemListesi(prev => [{
          id: recordId,
          file_url: fileUrl,
          file_name: fileName,
          status: 'pending',
          fields: activeFields,
          created_at: new Date().toISOString(),
          extracted_data: null,
        }, ...prev]);

        // Sadece arka planda kuyruğa ekle, MODALI OTOMATİK AÇMA (UX Düzeltmesi)
        const newQueueItem = {
          recordId,
          fileUrl,
          fileName,
          status: 'pending',
          isTimeoutError: false,
          metrics: activeFields
        };

        if (i === 0) {
          setUploadQueue([newQueueItem]);
          setUploadQueueIndex(0);
          // setIsUploadModalOpen(true); -> MODALI İPTAL EDİYORUZ, ARTIK LİSTEDEN TETİKLENECEK
        } else {
          setUploadQueue(prev => [...prev, newQueueItem]);
        }

        // 4. Trigger Senkron Webhook
        // Await ediyoruz: bu işlem bloğunu bekletecek, kullanıcı bu arada 'Yapay zeka analiz ediyor' animasyonunu izleyecek
        const webhookResult = await triggerWebhookSync(recordId, fileUrl, activeFields, fileName);

        if (!webhookResult.success && !webhookResult.isTimeout) {
          // Kesin hata durumu
          newFailed.push({ recordId, fileUrl, fileName: currentFile.name, metrics: activeFields, isRetrying: false });
        } else if (webhookResult.success) {
          successCount++;
        }
      }

      if (newFailed.length > 0) {
        setFailedWebhooks(prev => [...prev, ...newFailed]);
        showToast(`${newFailed.length} evrak gönderilemedi!`, 'error');
      }

      if (successCount > 0) {
        showToast(
          successCount === 1
            ? '✓ Evrak kuyruğa alındı — Aşağıdaki listeden takip edin!'
            : `✓ ${successCount} evrak kuyruğa alındı — Aşağıdaki listeden takip edin!`,
          'success'
        );
      }

      // Formu sıfırla — sayfada kalıyoruz, yönlendirme YOK
      setSelectedFiles([]);

    } catch (error) {
      console.error('[handleAnalyze] Hata:', error);
      showToast('İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const parseExtractedData = useCallback((row) => {
    let raw = row.extracted_data;
    try {
      if (raw && typeof raw === 'object') return raw;
      if (typeof raw === 'string' && raw.trim()) return JSON.parse(raw);
      const fb = row.fields;
      if (fb && typeof fb === 'object') return fb;
      if (typeof fb === 'string') return JSON.parse(fb);
    } catch (e) {
      console.error('[Parse Data] hata:', e, raw);
    }
    return {};
  }, []);

  const openReviewModal = (item) => {
    setSelectedModalItem(item);
    setModalFormData(parseExtractedData(item));
  };

  const handleSaveReview = async () => {
    if (!selectedModalItem) return;
    setIsModalSaving(true);
    try {
      const { error } = await supabase
        .from('evrak_islemleri')
        .update({ status: 'TAMAMLANDI', extracted_data: modalFormData })
        .eq('id', selectedModalItem.id);

      if (error) throw error;

      showToast('Veriler başarıyla sisteme kaydedildi.', 'success');
      setSelectedModalItem(null); // Modalı kapat
      fetchIslemListesi(); // Listeyi yenile
    } catch (err) {
      console.error('[handleSaveReview] Hata:', err);
      showToast('İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.', 'error');
    } finally {
      setIsModalSaving(false);
    }
  };

  // Upload-Review Modal: Onayla ve sıradakine geç
  const handleSaveUploadReview = async () => {
    const currentItem = uploadQueue[uploadQueueIndex];
    if (!currentItem?.recordId) return;
    setIsUploadModalSaving(true);
    try {
      const { error } = await supabase
        .from('evrak_islemleri')
        .update({ status: 'TAMAMLANDI', extracted_data: uploadModalFormData })
        .eq('id', currentItem.recordId);
      if (error) throw error;

      showToast('Veri kaydedildi!', 'success');

      // Sırada başka evrak var mı?
      const nextIndex = uploadQueueIndex + 1;
      if (nextIndex < uploadQueue.length) {
        setUploadQueueIndex(nextIndex);
        setUploadModalFormData({});
      } else {
        // Tüm kuyruk bitti, modalı kapat
        setIsUploadModalOpen(false);
        setUploadQueue([]);
        setUploadQueueIndex(0);
        fetchIslemListesi();
      }
    } catch (err) {
      console.error('[handleSaveUploadReview] Hata:', err);
      showToast('İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.', 'error');
    } finally {
      setIsUploadModalSaving(false);
    }
  };

  const handleClearList = async () => {
    // DB'deki evrakları İPTAL EDİLMİŞ statüsüne çek
    const activeIds = islemListesi.map(it => it.id);
    if (activeIds.length > 0) {
      try {
        await supabase.from('evrak_islemleri').update({ status: 'İPTAL EDİLDİ' }).in('id', activeIds);
      } catch (e) {
        console.error("Listeyi temizlerken durum güncellemesi başarısız oldu:", e);
      }
    }

    // UI'daki tüm işlem state'lerini sıfırla
    setIslemListesi([]);
    setFailedWebhooks([]);
    setSessionBatchIds([]);
    setUploadQueue([]);
    setReportName('');
    showToast('Liste temizlendi ve evrak işlemleri iptal edildi.', 'success');
  };

  // ─── Excel'e Toplu Gönderim (İkinci Aşama) ───
  const handleExportToExcel = async () => {
    if (isExporting) return; // Mükerrer İstek Kilidi (Double-Click Prevention)

    const normalize = (s) => (s || '').trim().toUpperCase().replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ü/g, 'U').replace(/Ö/g, 'O');
    const completedItems = islemListesi.filter(item => normalize(item.status) === 'TAMAMLANDI');

    if (completedItems.length === 0) return;

    setIsExporting(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 saniye timeout (120000 ms)

    try {
      // 1. Kullanıcı oturum bilgisini al (Güvenlik / Klasör izolesi için)
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || '';

      const exportData = completedItems.map(item => ({
        ...parseExtractedData(item)
      }));

      const response = await fetch('https://denemeazim10.app.n8n.cloud/webhook/save-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          dosyaIsmi: reportName,
          items: exportData,
          user_id: userId
        }),
        signal: controller.signal // AbortController sinyali
      });

      clearTimeout(timeoutId); // Başarılı olursa timeout'ı temizle

      if (!response.ok) {
        if (response.status === 504 || response.status === 502) {
          throw new Error('TIMEOUT');
        }
        throw new Error(`Sunucu Hatası: ${response.status}`);
      }

      showToast("Onaylanan evraklar Excel'e aktarıldı!", 'success');

      // UX Kuralı: Otomatik Temizlik (Tüm listeyi sıfırla ki tertemiz başlansın ve asılı kalanlar silinsin)
      setIslemListesi([]);
      setFailedWebhooks([]);
      setSessionBatchIds([]);
      setUploadQueue([]);

      // Toplu işlem bittiğine göre Input hafızasını sıfırla
      setReportName('');

    } catch (err) {
      clearTimeout(timeoutId); // Hata durumunda da timeout'ı temizle
      console.error('[Export Excel] Hata:', err);

      if (err.name === 'AbortError' || err.message === 'TIMEOUT') {
        showToast('İşlem çok uzun sürdü, Excel arka planda oluşturuluyor olabilir.', 'error');
      } else if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        showToast("Bağlantı Hatası: Lütfen internet bağlantınızı kontrol edin veya n8n akışının açık olduğundan emin olun.", "error");
      } else {
        showToast('Excel aktarımında bir hata oluştu.', 'error');
      }
    } finally {
      setIsExporting(false); // İşlem bitince kilidi aç
    }
  };
  return (
    <div className="flex h-screen bg-[#0A0A14] text-[#F0EFF4] font-sans selection:bg-[#7B61FF] selection:text-white overflow-hidden relative">
      <div className="noise-overlay" />

      {/* Toast Notification */}
      <div className={`fixed top-6 left-6 z-50 transition-all duration-300 transform ${toastMessage.visible ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0 pointer-events-none'}`}>
        <div className={`px-6 py-4 rounded-xl border flex items-center gap-3 shadow-xl ${toastMessage.type === 'error' ? 'bg-red-950/90 border-red-500/50 text-red-200 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'bg-green-950/90 border-green-500/50 text-green-200 shadow-[0_0_30px_rgba(34,197,94,0.2)]'}`}>
          {toastMessage.type === 'error' ? <ShieldCheck size={20} className="text-red-400" /> : <Check size={20} className="text-green-400" />}
          <span className="font-medium text-sm">{toastMessage.text}</span>
        </div>
      </div>

      {/* ─── Mobil Overlay (Arkaplan Kilidi) ─── */}
      <div 
        className={`fixed inset-0 bg-[#05050A]/80 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileMenuOpen(false)} 
      />

      {/* Sol Menü (Sidebar) */}
      <aside className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} ${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-[#05050A]/95 md:bg-[#05050A]/80 backdrop-blur-xl border-r border-white/5 flex flex-col justify-between h-full`}>
        <div>
          {/* Logo + Toggle Butonu */}
          <div className={`flex items-center mb-8 min-h-[72px] transition-all duration-300 ${isSidebarCollapsed ? 'flex-col gap-4 mt-6' : 'p-4 justify-between'}`}>
            <div className={`flex items-center gap-3 overflow-hidden ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-[#7B61FF] to-indigo-600 flex items-center justify-center shadow-[0_0_15px_#7b61ff80]">
                <span className="text-white text-xl font-bold leading-none">M</span>
              </div>
              <span className={`text-xl font-bold tracking-tight text-white transition-all duration-300 whitespace-nowrap ${isSidebarCollapsed ? 'opacity-0 w-0 h-0 hidden' : 'opacity-100'}`}>MUHASY</span>
            </div>
            <button
              onClick={() => setIsSidebarCollapsed(prev => !prev)}
              className={`shrink-0 p-1.5 rounded-xl bg-transparent text-gray-400 hover:text-white hover:bg-[#7B61FF]/20 transition-all duration-200 ${isSidebarCollapsed ? '' : ''}`}
              title={isSidebarCollapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt'}
            >
              {isSidebarCollapsed
                ? <PanelLeftOpen size={18} />
                : <PanelLeftClose size={18} />}
            </button>
          </div>

          <nav className="flex flex-col gap-2 px-3 text-gray-400 font-sans">
            {[
              { id: 'panel', icon: LayoutDashboard, label: 'Panel' },
              { id: 'z-raporlari', icon: UploadCloud, label: 'Yeni Evrak Yükle' },
              { id: 'gecmis-raporlar', icon: History, label: 'Geçmiş Raporlar' },
              { id: 'ayarlar', icon: Settings, label: 'Ayarlar' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                title={isSidebarCollapsed ? item.label : ''}
                className={`flex items-center gap-3 py-3 rounded-[1.25rem] transition-all duration-300 w-full text-left group ${activeTab === item.id
                  ? 'bg-[#7B61FF]/10 text-[#7B61FF] border border-[#7B61FF]/30 shadow-[0_0_15px_#7b61ff20]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:-translate-y-px'
                  } ${isSidebarCollapsed ? 'justify-center px-0' : 'px-4'}`}
              >
                <item.icon size={20} className={`shrink-0 ${activeTab === item.id ? '' : 'transition-transform group-hover:scale-110'}`} />
                <span className={`whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'} ${activeTab === item.id ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-3 mb-4">
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }}
            title={isSidebarCollapsed ? 'Çıkış Yap' : ''}
            className={`w-full flex items-center gap-3 py-3 rounded-[1.25rem] text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all duration-300 hover:-translate-y-px group ${isSidebarCollapsed ? 'justify-center px-0' : 'px-4'}`}
          >
            <LogOut size={20} className="shrink-0 transition-transform group-hover:scale-110" />
            <span className={`font-medium font-sans whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* Ana İçerik Alanı */}
      <main className="flex-1 flex flex-col relative z-10 overflow-hidden bg-transparent">
        {/* ─── Mobil Header ─── */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-[#05050A]/80 backdrop-blur-md shrink-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7B61FF] to-indigo-600 flex items-center justify-center shadow-md">
              <span className="text-white text-lg font-bold leading-none">M</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-white">MUHASY</span>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-colors"
          >
            <Menu size={24} />
          </button>
        </header>

        <div className="flex-1 p-4 md:p-8 flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto w-full overflow-y-auto">

          {activeTab === 'panel' && (
            <div className="flex-1 flex flex-col gap-6">
              <div className="flex items-center mb-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">Sistem Özeti</h1>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#18181B]/80 border border-white/5 hover:border-[#7B61FF]/30 transition-colors rounded-[2rem] p-6 group relative overflow-hidden backdrop-blur-md">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#7B61FF]/5 rounded-full blur-3xl group-hover:bg-[#7B61FF]/10 transition-colors pointer-events-none"></div>
                  <div className="flex justify-between items-start mb-6">
                    <p className="text-gray-400 text-sm font-medium font-sans">Bu Ay İşlenen Evrak</p>
                    <div className="p-2.5 bg-[#7B61FF]/10 rounded-xl border border-[#7B61FF]/20">
                      <FileText size={20} className="text-[#7B61FF]" />
                    </div>
                  </div>
                  <h3 className="text-4xl font-bold text-white font-data tracking-tight">{dashboardStats.toplamEvrak.toLocaleString('tr-TR')}</h3>
                </div>

                <div className="bg-[#18181B]/80 border border-white/5 hover:border-cyan-500/30 transition-colors rounded-[2rem] p-6 group relative overflow-hidden backdrop-blur-md">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-colors pointer-events-none"></div>
                  <div className="flex justify-between items-start mb-6">
                    <p className="text-gray-400 text-sm font-medium font-sans">Tasarruf Edilen Zaman</p>
                    <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                      <Clock size={20} className="text-cyan-400" />
                    </div>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white font-data tracking-tight">{dashboardStats.tasarrufZamani}</h3>
                </div>

                <div className="bg-[#18181B]/80 border border-white/5 hover:border-emerald-500/30 transition-colors rounded-[2rem] p-6 group relative overflow-hidden backdrop-blur-md">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none"></div>
                  <div className="flex justify-between items-start mb-6">
                    <p className="text-gray-400 text-sm font-medium font-sans">Hata Oranı</p>
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                      <ShieldCheck size={20} className="text-emerald-400" />
                    </div>
                  </div>
                  <h3 className="text-4xl font-bold text-white font-data tracking-tight">-</h3>
                </div>
              </div>

              {/* Son Aktiviteler */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 font-sans">
                  <Activity size={18} className="text-[#7B61FF]" />
                  Son Aktiviteler
                </h3>
                <div className="bg-[#18181B]/50 border border-white/5 rounded-[2rem] overflow-hidden p-4 text-sm backdrop-blur-sm">
                  {recentActivities.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 font-sans">Henüz aktivite bulunmuyor.</div>
                  ) : (
                    recentActivities.map((activity, idx) => {
                      const dateObj = new Date(activity.created_at);

                      // Calculate relative time (e.g., "5 dakika önce")
                      const now = new Date();
                      const diffInSeconds = Math.floor((now - dateObj) / 1000);

                      let timeAgo = '';
                      if (diffInSeconds < 60) {
                        timeAgo = 'Az önce';
                      } else if (diffInSeconds < 3600) {
                        timeAgo = `${Math.floor(diffInSeconds / 60)} dakika önce`;
                      } else if (diffInSeconds < 86400) {
                        timeAgo = `${Math.floor(diffInSeconds / 3600)} saat önce`;
                      } else {
                        timeAgo = `${Math.floor(diffInSeconds / 86400)} gün önce`;
                      }

                      return (
                        <div key={activity.id || idx} className={`flex items-center gap-4 p-4 hover:bg-white-[0.02] rounded-xl transition-colors cursor-pointer ${idx !== recentActivities.length - 1 ? 'border-b border-white/5' : ''}`}>
                          <div className="w-10 h-10 rounded-xl bg-[#7B61FF]/10 flex items-center justify-center shrink-0 border border-[#7B61FF]/20">
                            <FileText size={18} className="text-[#7B61FF]" />
                          </div>
                          <div className="flex flex-col flex-1">
                            <span className="font-medium text-white mb-1 font-sans">{activity.name} Excel dosyası oluşturuldu</span>
                            <span className="text-xs text-gray-500 font-data">{timeAgo}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'z-raporlari' && (
            <div className="flex-1 flex flex-col min-h-0">
              <header className="mb-6 shrink-0">
                <h1 className="text-2xl font-bold text-white mb-1 font-sans">Yeni Evrak Yükle</h1>
                <p className="text-gray-500 text-sm font-sans">Fiş, fatura veya Z-raporlarınızı sisteme aktarın. İşlemler anlık olarak aşağıda listelenir.</p>
              </header>

              {/* Split-Panel Grid */}
              <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">

                {/* ─── SOL PANEL — %65 ─── */}
                <div className="flex flex-col gap-5 lg:w-[65%]">

                  {/* Rapor/Dosya İsmi */}
                  <div className="sticky top-0 z-[50] bg-[#0A0A0A] md:bg-[#18181B]/80 border-b md:border border-white/10 md:border-white/5 md:backdrop-blur-md rounded-b-3xl md:rounded-[2rem] p-5 md:p-5 shadow-[0_20px_40px_rgba(0,0,0,0.8)] md:shadow-xl shrink-0 -mx-4 md:mx-0 px-8 md:px-5">
                    <label className="text-[10px] font-bold text-[#7B61FF] block mb-2 tracking-widest font-data uppercase">Rapor / Dosya İsmi</label>
                    <input
                      ref={reportNameInputRef}
                      type="text"
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      placeholder="Örn: Mart_Ayı_Giderleri"
                      className="w-full bg-[#0A0A14] border border-white/10 rounded-xl px-4 py-3 text-[#F0EFF4] placeholder-gray-600 focus:outline-none focus:border-[#7B61FF]/60 focus:shadow-[0_0_15px_rgba(123,97,255,0.15)] transition-all duration-300 font-data text-sm shadow-inner"
                    />
                  </div>

                  {/* Drag & Drop Zone — Her Zaman Temiz */}
                  <div
                    className={`relative rounded-[2rem] border-2 border-dashed flex items-center justify-center p-8 md:p-12 transition-all duration-300 min-h-[220px] ${dragActive ? 'border-[#7B61FF] bg-[#7B61FF]/10 shadow-[0_0_60px_rgba(123,97,255,0.25)]' : 'border-white/10 bg-[#18181B]/40 hover:border-[#7B61FF]/50 hover:bg-[#18181B]/80 backdrop-blur-sm'}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <label className="relative z-10 flex flex-col items-center text-center max-w-md group cursor-pointer w-full">
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#7B61FF]/10 border border-[#7B61FF]/30 flex items-center justify-center mb-4 md:mb-6 shadow-[0_0_20px_#7B61FF30] group-hover:scale-110 group-hover:bg-[#7B61FF]/20 transition-all duration-500">
                        <UploadCloud size={40} className="text-[#7B61FF]" />
                      </div>
                      <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight font-sans">Sürükle & Bırak</h3>
                      <div className="text-gray-400 text-base mb-6 flex items-center gap-1.5 justify-center font-sans">
                        <span>veya</span>
                        <span className="text-[#7B61FF] hover:text-[#917bfd] font-medium transition-colors underline underline-offset-2 decoration-[#7B61FF]/40">Dosyaları Seç</span>
                      </div>
                      <div className="inline-flex items-center justify-center bg-[#0A0A14]/80 rounded-xl px-5 py-2.5 border border-white/5 shadow-inner">
                        <span className="text-[#7B61FF] text-[10px] uppercase tracking-widest font-bold font-data">JPG · PNG · PDF · ZIP kabul edilir</span>
                      </div>
                      <input type="file" className="hidden" multiple accept=".jpg,.jpeg,.png,.pdf,.zip" onChange={(e) => handleFileSelect(e.target.files)} />
                    </label>
                  </div>

                  {/* Seçili Dosya Listesi — Dropzone'un Altında, Temiz Akış */}
                  {selectedFiles.length > 0 && (
                    <div className="flex flex-col gap-2 p-4 bg-[#18181B]/80 border border-white/5 rounded-[1.5rem] backdrop-blur-md shadow-lg">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-data">{selectedFiles.length} Dosya Seçildi</span>
                        </div>
                        <button
                          onClick={(e) => { e.preventDefault(); setSelectedFiles([]); setReportName(''); }}
                          className="text-[10px] text-gray-600 hover:text-red-400 font-medium transition-colors font-data uppercase tracking-widest"
                        >
                          Temizle
                        </button>
                      </div>
                      {selectedFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#0A0A14]/60 border border-white/5">
                          <FileText size={14} className="text-[#7B61FF] shrink-0" />
                          <span className="text-xs text-[#F0EFF4] font-data truncate flex-1">{f.name}</span>
                          <span className="text-[10px] text-gray-600 font-data shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                        </div>
                      ))}
                      <label className="mt-1 w-full min-h-[40px] border border-dashed border-[#7B61FF]/30 hover:border-[#7B61FF]/60 text-[#7B61FF] hover:bg-[#7B61FF]/5 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer font-sans">
                        <Plus size={14} strokeWidth={3} /> Başka Dosya Ekle
                        <input type="file" className="hidden" multiple accept=".jpg,.jpeg,.png,.pdf,.zip" onChange={(e) => { if (e.target.files) handleFileSelect([...selectedFiles, ...Array.from(e.target.files)]); }} />
                      </label>
                    </div>
                  )}

                  {/* Hata Alan Webhook'lar */}
                  {failedWebhooks.length > 0 && (
                    <div className="space-y-3 pb-2 shrink-0">
                      <h3 className="text-red-400 font-semibold text-sm flex items-center gap-2 font-sans">
                        <ShieldCheck size={16} /> Gönderilemeyen Evraklar ({failedWebhooks.length})
                      </h3>
                      {failedWebhooks.map(item => (
                        <div key={item.recordId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-red-950/30 border border-red-900/50 rounded-2xl gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shrink-0">
                              <FileText size={20} className="text-red-400" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white truncate max-w-[200px] font-sans">{item.fileName}</p>
                              <p className="text-xs text-red-400/80 font-data">Sunucu yanıt vermedi</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleManualRetry(item)}
                            disabled={item.isRetrying}
                            className={`px-4 py-2 w-full sm:w-auto bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl text-sm font-bold transition-colors border border-red-500/30 flex items-center justify-center gap-2 font-sans ${item.isRetrying ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {item.isRetrying ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                            Tekrar Gönder
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ─── SAĞ PANEL — %35 ─── */}
                <div className="flex flex-col lg:w-[35%] shrink-0">
                  <div className="bg-[#18181B]/80 border border-white/5 backdrop-blur-md rounded-[2rem] p-6 shadow-xl flex flex-col flex-1">

                    {/* Panel Başlığı */}
                    <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/5">
                      <div className="w-7 h-7 rounded-lg bg-[#7B61FF]/10 border border-[#7B61FF]/20 flex items-center justify-center">
                        <Settings size={14} className="text-[#7B61FF]" />
                      </div>
                      <h2 className="text-sm font-bold text-white font-sans tracking-wide">Veri Çıkarım Ayarları</h2>
                      <span className="ml-auto text-[10px] text-gray-600 font-data uppercase tracking-widest">requested_metrics</span>
                    </div>

                    {/* Metrik Listesi */}
                    <div className="flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar pr-1 mb-4">
                      {extractionFields.map(field => (
                        <div key={field.id} className={`flex items-center gap-3 px-4 py-3 rounded-[1.25rem] border transition-all duration-200 group ${field.active ? 'border-[#7B61FF]/30 bg-[#7B61FF]/10 shadow-[inset_0_0_10px_rgba(123,97,255,0.08)]' : 'border-white/5 bg-[#0A0A14]/50 hover:border-white/10 hover:bg-[#0A0A14]/80'}`}>
                          <button
                            type="button"
                            onClick={() => toggleField(field.id)}
                            className={`w-5 h-5 rounded-[0.4rem] flex items-center justify-center shrink-0 transition-all duration-200 border ${field.active ? 'bg-[#7B61FF] border-[#7B61FF] text-white shadow-[0_0_10px_#7B61FF80]' : 'border-gray-600 text-transparent hover:border-[#7B61FF]/50'}`}
                          >
                            <Check size={12} strokeWidth={3.5} />
                          </button>
                          {field.isCustom ? (
                            <input
                              type="text"
                              value={field.name}
                              onChange={(e) => updateCustomFieldName(field.id, e.target.value)}
                              placeholder="Özel alan adı..."
                              className={`bg-transparent border-none outline-none text-base min-h-[44px] w-full flex-1 font-data tracking-wide ${field.active ? 'text-white' : 'text-gray-500'}`}
                              autoFocus
                            />
                          ) : (
                            <span className={`text-base min-h-[44px] flex items-center font-medium flex-1 font-data tracking-wide ${field.active ? 'text-[#F0EFF4]' : 'text-gray-500'}`}>
                              {field.name}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeField(field.id)}
                            className="text-gray-700 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-red-400/10 opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={addCustomField}
                        className="w-full min-h-[48px] py-3 mt-1 border-2 border-dashed border-white/10 hover:border-[#7B61FF]/50 text-gray-500 hover:text-[#7B61FF] hover:bg-[#7B61FF]/5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all duration-200 font-sans tracking-widest uppercase"
                      >
                        <Plus size={14} />
                        Özel Alan Ekle
                      </button>
                    </div>

                    {/* ── Onay Bekleyen Evrak Kartları (Analizi Başlat üstünde) ── */}
                    {uploadQueue.filter(q => {
                      const norm = (q.status || '').trim().toUpperCase().replace(/İ/g,'I').replace(/Ş/g,'S');
                      return norm.includes('ONAY') && norm.includes('BEKL');
                    }).length > 0 && (
                      <div className="flex flex-col gap-2 mb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest font-data">Onay Bekleyen Evraklar</span>
                        </div>
                        {uploadQueue.filter(q => {
                          const norm = (q.status || '').trim().toUpperCase().replace(/İ/g,'I').replace(/Ş/g,'S');
                          return norm.includes('ONAY') && norm.includes('BEKL');
                        }).map(q => {
                          const listItem = islemListesi.find(it => it.id === q.recordId);
                          return (
                            <div key={q.recordId} className="flex items-center justify-between gap-3 p-3 rounded-[1.25rem] border border-amber-500/20 bg-amber-500/5 hover:border-amber-400/40 hover:bg-amber-500/10 transition-all duration-200">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="relative w-9 h-9 shrink-0 rounded-lg overflow-hidden border border-white/10">
                                  {q.fileUrl ? (
                                    <img src={q.fileUrl} alt="Evrak" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-[#18181B]">
                                      <FileText size={14} className="text-gray-600" />
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs font-bold text-[#F0EFF4] truncate max-w-[90px] font-sans">{q.fileName}</span>
                              </div>
                              <button
                                onClick={() => listItem ? openReviewModal(listItem) : null}
                                className="relative overflow-hidden group/btn shrink-0 px-3 py-1.5 min-h-[32px] bg-gradient-to-r from-[#7B61FF] to-fuchsia-500 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-[0_2px_10px_rgba(123,97,255,0.4)] hover:shadow-[0_4px_16px_rgba(123,97,255,0.6)] hover:scale-[1.04] transition-all duration-200 whitespace-nowrap font-sans"
                              >
                                <span className="absolute inset-0 bg-gradient-to-r from-fuchsia-500 to-[#7B61FF] -translate-x-full group-hover/btn:translate-x-0 transition-transform duration-300 z-0" />
                                <span className="relative z-10 flex items-center gap-1">
                                  <Eye size={11} /> İncele & Onayla
                                </span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ── Analizi Başlat Butonu ── */}
                    <button
                      onClick={handleAnalyze}
                      disabled={isProcessing || selectedFiles.length === 0}
                      className={`relative overflow-hidden group w-full min-h-[52px] py-4 rounded-2xl text-base font-bold transition-all duration-300 flex items-center justify-center gap-2 font-sans tracking-widest uppercase ${isProcessing || selectedFiles.length === 0
                        ? 'bg-[#18181B] border border-white/5 cursor-not-allowed text-gray-600 shadow-none'
                        : 'bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white shadow-[0_4px_20px_rgba(168,85,247,0.45)] hover:scale-105 hover:shadow-[0_6px_30px_rgba(168,85,247,0.6)] ease-[cubic-bezier(0.25,0.46,0.45,0.94)]'
                        }`}
                    >
                      {(!isProcessing && selectedFiles.length > 0) && (
                        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-fuchsia-600 to-purple-500 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out z-0" />
                      )}
                      <span className="relative z-10 flex items-center gap-2">
                        {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                        {isProcessing ? 'İşleniyor...' : 'Analizi Başlat'}
                      </span>
                    </button>

                  </div>
                </div>
                {/* İşlem Listesi kapanış etiketi — aşağıda devam ediyor */}

              </div>
              {/* ── İşlem Listesi (Yükleme Panelinin Altına Embed) ── */}
              {islemListesi.length > 0 && (
                <div className="mt-20 md:mt-10 w-full relative z-30">
                  {/* Dekoratif ayraç */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-[#7B61FF]/10 border border-[#7B61FF]/20 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#7B61FF] animate-pulse shadow-[0_0_6px_rgba(123,97,255,0.8)]" />
                      <span className="text-[10px] font-bold text-[#7B61FF] uppercase tracking-widest font-data">Canlı İşlem Akışı</span>
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-white font-sans tracking-tight">İşlem Listesi</h2>
                      <p className="text-gray-500 text-xs font-sans mt-0.5">Yüklenen evrakların AI analiz durumu — Realtime güncellenir.</p>
                    </div>
                    <button
                      onClick={fetchIslemListesi}
                      title="Listeyi yenile"
                      className="w-9 h-9 bg-[#18181B] border border-white/5 hover:bg-white/5 text-[#7B61FF] rounded-xl flex items-center justify-center transition-colors shadow-inner"
                    >
                      <Activity size={16} className={loadingIslem ? 'animate-spin' : ''} />
                    </button>
                  </div>

                  <div className="bg-[#18181B]/40 border border-white/5 rounded-[2rem] overflow-hidden backdrop-blur-md shadow-xl w-full">
                    <div className="p-5 space-y-3 max-h-[600px] overflow-y-auto overflow-x-hidden custom-scrollbar w-full">
                      {loadingIslem && islemListesi.length === 0 ? (
                        <div className="flex justify-center items-center py-16 text-gray-400">
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 size={28} className="animate-spin text-[#7B61FF]" />
                            <span className="text-sm font-medium font-sans">İşlemler Yükleniyor...</span>
                          </div>
                        </div>
                      ) : islemListesi.length === 0 ? (
                        <div className="text-center py-16 text-gray-600 font-medium font-sans">
                          <List size={36} className="mx-auto mb-3 text-gray-700" />
                          <p className="text-sm">Henüz bir işlem bulunmuyor.</p>
                          <p className="text-xs text-gray-700 mt-1">Yukarıdan dosya yükle ve Analizi Başlat butonuna bas.</p>
                        </div>
                      ) : (
                        islemListesi.map(item => {
                          const rawStatus = (item.status || '').trim();
                          const norm = rawStatus.toUpperCase()
                            .replace(/İ/g, 'I').replace(/Ş/g, 'S')
                            .replace(/Ü/g, 'U').replace(/Ö/g, 'O');
                          const isPending = norm.includes('ONAY') && norm.includes('BEKL');
                          const isDone = norm === 'TAMAMLANDI';
                          const isError = norm === 'HATA';

                          return (
                            <div key={item.id}
                              className={`group overflow-x-auto custom-scrollbar rounded-[1.5rem] border transition-all duration-300 w-full ${isPending
                                ? 'border-amber-500/20 bg-amber-500/5 hover:border-amber-400/40 hover:bg-amber-500/10 hover:shadow-[0_0_20px_rgba(251,191,36,0.1)]'
                                : isDone
                                  ? 'border-emerald-500/10 bg-emerald-500/5 hover:border-emerald-500/25 hover:bg-emerald-500/10'
                                  : isError
                                    ? 'border-red-500/15 bg-red-500/5 hover:border-red-500/30'
                                    : 'border-white/5 bg-[#0A0A14]/80 hover:border-[#7B61FF]/25 hover:bg-[#0A0A14]/60'
                                }`}
                            >
                              <div className="flex items-center justify-between gap-4 p-4 min-w-[max-content] md:min-w-0 w-full">
                                {/* Sol: Thumbnail + Meta (Sabit kolon için sticky class) */}
                                <div className="flex items-center gap-3 min-w-0 shrink-0 sticky left-0 z-10 pl-2 bg-[#18181B]/90 md:bg-transparent backdrop-blur-sm rounded-r-xl">
                                  <div className="relative w-14 h-14 shrink-0 rounded-xl overflow-hidden border border-white/8 shadow-md">
                                    {item.file_url ? (
                                      <img src={item.file_url} alt="Evrak" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-[#18181B]">
                                        <FileText size={20} className="text-gray-600" />
                                      </div>
                                    )}
                                    <div className={`absolute top-1 right-1 w-2 h-2 rounded-full border border-[#0A0A14] ${isPending ? 'bg-amber-400 animate-pulse shadow-[0_0_4px_rgba(251,191,36,0.9)]'
                                      : isDone ? 'bg-emerald-400'
                                        : isError ? 'bg-red-400'
                                          : 'bg-[#7B61FF] animate-pulse'
                                      }`} />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-bold text-[#F0EFF4] truncate max-w-[160px] sm:max-w-xs font-sans tracking-tight text-sm">
                                      {item.file_name || 'İsimsiz Evrak'}
                                    </span>
                                    <span className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1 font-data uppercase tracking-wider">
                                      <Clock size={8} />
                                      {new Date(item.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {Array.isArray(item.fields) && item.fields.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {item.fields.slice(0, 3).map((f, fi) => (
                                          <span key={fi} className="text-[8px] font-data px-1.5 py-0.5 bg-white/5 text-gray-600 rounded border border-white/5">{f}</span>
                                        ))}
                                        {item.fields.length > 3 && (
                                          <span className="text-[8px] font-data px-1 text-gray-700">+{item.fields.length - 3}</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Sağ: Durum + Buton (Sağa kaydırılabilir alan içinde) */}
                                <div className="flex items-center gap-3 justify-end shrink-0 pr-2">
                                  <div>
                                    {isPending ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-400 rounded-lg text-[10px] font-bold tracking-widest border border-amber-500/25 uppercase font-data">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Onay Bekliyor
                                      </span>
                                    ) : isDone ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-[10px] font-bold tracking-widest border border-emerald-500/20 uppercase font-data">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Tamamlandı
                                      </span>
                                    ) : isError ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 text-red-400 rounded-lg text-[10px] font-bold tracking-widest border border-red-500/20 uppercase font-data">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Başarısız
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#7B61FF]/10 text-[#7B61FF] rounded-lg text-[10px] font-bold tracking-widest border border-[#7B61FF]/20 uppercase font-data">
                                        <Loader2 size={9} className="animate-spin" /> Okunuyor
                                      </span>
                                    )}
                                  </div>

                                  {isPending ? (
                                    <button
                                      onClick={() => openReviewModal(item)}
                                      className="relative overflow-hidden group/btn px-6 py-3 md:px-4 md:py-2 min-h-[44px] bg-gradient-to-r from-[#7B61FF] to-fuchsia-500 text-white text-[13px] md:text-[11px] font-bold rounded-xl flex items-center gap-1.5 shadow-[0_2px_12px_rgba(123,97,255,0.4)] hover:shadow-[0_4px_20px_rgba(123,97,255,0.6)] hover:scale-[1.04] transition-all duration-300 whitespace-nowrap font-sans tracking-wide"
                                    >
                                      <span className="absolute inset-0 bg-gradient-to-r from-fuchsia-500 to-[#7B61FF] -translate-x-full group-hover/btn:translate-x-0 transition-transform duration-400 z-0" />
                                      <span className="relative z-10 flex items-center gap-1.5">
                                        <Eye size={13} /> İncele &amp; Onayla
                                      </span>
                                    </button>
                                  ) : isDone ? (
                                    <button
                                      onClick={() => openReviewModal(item)}
                                      className="px-6 py-3 md:px-3 md:py-2 min-h-[44px] bg-[#18181B] border border-white/8 text-gray-500 hover:text-white hover:border-white/20 text-[13px] md:text-[11px] font-bold rounded-xl flex items-center gap-1.5 transition-colors whitespace-nowrap font-sans"
                                    >
                                      <Eye size={13} /> Görüntüle
                                    </button>
                                  ) : (
                                    <button disabled className="px-5 py-3 bg-[#18181B] border border-white/5 text-gray-700 text-[12px] font-bold rounded-xl cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap font-sans min-h-[44px]">
                                      <Loader2 size={13} className="animate-spin" /> Bekleniyor
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* ─── Excel'e Aktar Butonu ─── */}
                    {islemListesi.length > 0 && (() => {
                      const completedCount = islemListesi.filter(i => {
                        const n = (i.status || '').trim().toUpperCase().replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ü/g, 'U').replace(/Ö/g, 'O');
                        return n === 'TAMAMLANDI';
                      }).length;

                      const isBtnDisabled = completedCount === 0 || isExporting;

                      return (
                        <div className="p-6 border-t border-white/5 bg-[#05050A]/60 flex flex-col md:flex-row items-center justify-between gap-6 mt-6 md:mt-2">
                          {completedCount > 0 && (
                            <p className="text-gray-400 text-xs font-sans text-center md:text-left leading-relaxed">
                              <span className="text-emerald-400 font-bold text-[13px]">{completedCount} evrak</span>{" Excel'e aktarılmaya hazır."}
                            </p>
                          )}
                          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                            <button
                              onClick={handleClearList}
                              className="px-5 py-3.5 min-h-[44px] w-full md:w-auto justify-center rounded-xl border border-white/10 hover:border-red-500/30 bg-[#18181B] hover:bg-red-500/10 text-gray-400 hover:text-red-400 text-sm font-bold flex items-center gap-2 transition-all duration-300 shadow-inner group font-sans"
                            >
                              <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                              Listeyi Temizle
                            </button>
                            <button
                              onClick={handleExportToExcel}
                              disabled={isBtnDisabled}
                              className={`relative overflow-hidden w-full md:w-auto justify-center min-h-[44px] group px-8 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2 font-sans tracking-wide transition-all duration-300 ${isBtnDisabled
                                ? 'bg-[#18181B]/50 border border-white/5 text-gray-600 cursor-not-allowed'
                                : 'bg-gradient-to-r from-emerald-600 to-green-500 text-white shadow-[0_4px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_6px_25px_rgba(16,185,129,0.5)] hover:-translate-y-1'
                                }`}
                            >
                              {!isBtnDisabled && <span className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 z-0" />}
                              <span className="relative z-10 flex items-center gap-2">
                                {isExporting ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                                {isExporting ? "Aktarılıyor..." : "Tamamlananları Excel'e Aktar"}
                              </span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'gecmis-raporlar' && (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white tracking-tight font-sans">Geçmiş Raporlar</h1>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                      type="text"
                      placeholder="Ara..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-11 pr-4 py-2.5 min-h-[44px] bg-[#0A0A14] border border-white/10 rounded-xl text-sm text-[#F0EFF4] focus:outline-none focus:border-[#7B61FF]/50 transition-colors w-64 shadow-inner font-sans"
                    />
                  </div>
                  <button
                    onClick={fetchReports}
                    disabled={loadingReports}
                    className="flex items-center justify-center p-2.5 min-h-[44px] min-w-[44px] bg-[#0A0A14] hover:bg-white/[0.03] border border-white/10 hover:border-[#7B61FF]/40 rounded-xl text-gray-400 hover:text-[#7B61FF] transition-all shadow-inner group"
                    title="Yenile"
                  >
                    <RefreshCcw size={18} className={`${loadingReports ? 'animate-spin text-[#7B61FF]' : 'group-hover:drop-shadow-[0_0_8px_rgba(123,97,255,0.8)]'}`} />
                  </button>
                </div>
              </div>

              <div className="bg-[#18181B]/80 border border-white/5 rounded-[2rem] overflow-hidden flex-1 flex flex-col backdrop-blur-md shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] font-data">
                        <th className="px-6 py-5 font-bold text-gray-500 uppercase tracking-widest">Tarih</th>
                        <th className="px-6 py-5 font-bold text-gray-500 uppercase tracking-widest">Rapor/Dosya İsmi</th>
                        <th className="px-6 py-5 font-bold text-gray-500 uppercase tracking-widest">Evrak Sayısı</th>
                        <th className="px-6 py-5 font-bold text-gray-500 uppercase tracking-widest">Durum</th>
                        <th className="px-6 py-5 font-bold text-gray-500 uppercase tracking-widest text-right">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm font-sans">
                      {loadingReports ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-16 text-center text-gray-400">
                            <div className="flex flex-col items-center justify-center gap-4">
                              <Loader2 size={32} className="animate-spin text-[#7B61FF]" />
                              <span className="font-bold tracking-wide">Raporlar yükleniyor...</span>
                            </div>
                          </td>
                        </tr>
                      ) : reports.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-16 text-center text-gray-500 font-medium tracking-wide">
                            Henüz geçmiş rapor bulunmuyor.
                          </td>
                        </tr>
                      ) : filteredVeriler.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-16 text-center text-gray-500 font-medium tracking-wide">
                            Aramanızla eşleşen rapor bulunamadı.
                          </td>
                        </tr>
                      ) : (
                        filteredVeriler.map((report, idx) => {
                          const dateObj = report.created_at ? new Date(report.created_at) : null;
                          const formattedDate = dateObj
                            ? `${dateObj.getDate().toString().padStart(2, '0')}.${(dateObj.getMonth() + 1).toString().padStart(2, '0')}.${dateObj.getFullYear()} `
                            : '-';

                          return (
                            <tr key={report.id || idx} className="hover:bg-white-[0.02] transition-colors group">
                              <td className="px-6 py-5 text-gray-400 font-data text-xs">{formattedDate}</td>
                              <td className="px-6 py-5 text-white font-bold tracking-tight">{report.name}</td>
                              <td className="px-6 py-5 text-gray-500 font-data">-</td>
                              <td className="px-6 py-5">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner font-data">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span>
                                  TAMAMLANDI
                                </span>
                              </td>
                              <td className="px-6 py-5 text-right">
                                <button
                                  onClick={() => handleDownload(report.name)}
                                  className="text-[#7B61FF] hover:text-[#917bfd] transition-colors p-2.5 rounded-xl hover:bg-[#7B61FF]/10 inline-flex border border-transparent hover:border-[#7B61FF]/30"
                                  title="İndir"
                                >
                                  <Download size={18} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ayarlar' && (
            <div className="flex-1 flex flex-col gap-8 max-w-4xl mx-auto w-full">
              <div className="flex items-center mb-2">
                <h1 className="text-2xl font-bold text-white tracking-tight font-sans">Ayarlar</h1>
              </div>

              <div className="bg-[#18181B]/80 border border-white/5 rounded-[2rem] p-8 backdrop-blur-md shadow-xl">
                <h2 className="text-lg font-bold text-white mb-6 border-b border-white/5 pb-4 flex items-center gap-2 font-sans tracking-wide">
                  <Lock size={18} className="text-[#7B61FF]" />
                  Hesap Bilgileri
                </h2>

                <div className="space-y-6 max-w-md">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[#7B61FF] block mb-2 tracking-widest font-data">E-posta Adresi</label>
                    <input
                      type="text"
                      disabled
                      value="admin@muhasy.com"
                      className="w-full bg-[#0A0A14] border border-white/5 rounded-xl px-4 py-3 text-gray-500 focus:outline-none cursor-not-allowed font-data shadow-inner"
                    />
                  </div>

                  <div>
                    <button className="px-6 py-3 bg-[#18181B] hover:bg-white/[0.03] text-gray-300 hover:text-[#7B61FF] rounded-xl text-sm font-bold transition-colors border border-white/10 hover:border-[#7B61FF]/30 font-sans tracking-wide">
                      Şifremi Sıfırla
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-[#18181B]/80 border border-white/5 rounded-[2rem] p-8 backdrop-blur-md shadow-xl">
                <h2 className="text-lg font-bold text-white mb-6 border-b border-white/5 pb-4 flex items-center gap-2 font-sans tracking-wide">
                  <Settings size={18} className="text-[#7B61FF]" />
                  Sistem Tercihleri
                </h2>

                <div className="space-y-4 max-w-md">
                  <div
                    className="flex items-center justify-between p-5 bg-[#0A0A14]/50 border border-white/5 hover:border-[#7B61FF]/30 rounded-[1.5rem] cursor-pointer hover:bg-white-[0.02] transition-colors shadow-inner group"
                    onClick={() => setAutoDownload(!autoDownload)}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-[#F0EFF4] mb-1 font-sans tracking-wide group-hover:text-white transition-colors">Otomatik Excel İndir</span>
                      <span className="text-xs text-gray-500 font-sans">İşlem tamamlandığında çıktıyı anında indir.</span>
                    </div>
                    <div>
                      {autoDownload ? (
                        <ToggleRight size={36} className="text-[#7B61FF] drop-shadow-[0_0_8px_rgba(123,97,255,0.5)] transition-all" />
                      ) : (
                        <ToggleLeft size={36} className="text-gray-600 transition-all" />
                      )}
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-between p-5 bg-[#0A0A14]/50 border border-white/5 hover:border-[#7B61FF]/30 rounded-[1.5rem] cursor-pointer hover:bg-white-[0.02] transition-colors shadow-inner group"
                    onClick={() => setNotifyEnd(!notifyEnd)}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-[#F0EFF4] mb-1 font-sans tracking-wide group-hover:text-white transition-colors">İşlem Bitince Bildirim Gönder</span>
                      <span className="text-xs text-gray-500 font-sans">Uzun süren işlemlerde masaüstü bildirimi al.</span>
                    </div>
                    <div>
                      {notifyEnd ? (
                        <ToggleRight size={36} className="text-[#7B61FF] drop-shadow-[0_0_8px_rgba(123,97,255,0.5)] transition-all" />
                      ) : (
                        <ToggleLeft size={36} className="text-gray-600 transition-all" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════ Upload-Review Queue Modal ═══════ */}
          {isUploadModalOpen && uploadQueue.length > 0 && (() => {
            const item = uploadQueue[uploadQueueIndex];
            const isWaiting = item.status === 'uploading' || item.status === 'pending';
            const isReady = item.status === 'ONAY BEKLİYOR';
            const isError = item.status === 'HATA';
            // Form verisi uploadModalFormData state'inden gelir (useEffect tarafından doldurulur)

            return (
              <div className="fixed inset-0 z-[200] flex bg-[#05050A]/97 backdrop-blur-xl">
                <div className="w-full h-full flex flex-col md:flex-row overflow-hidden">

                  {/* ─── Sol %50: Dosya Önizleme ─── */}
                  <div className="w-full h-[120px] shrink-0 md:w-1/2 md:h-full bg-[#0A0A14] border-b md:border-b-0 md:border-r border-white/5 flex flex-col relative">

                    {/* Üst Bar */}
                    <div className="flex items-center justify-between px-4 py-2 md:px-6 md:py-4 border-b border-white/5 bg-[#05050A]/80 backdrop-blur-md z-10">
                      <div className="flex items-center gap-3">
                        <Eye size={16} className="text-[#7B61FF]" />
                        <span className="text-white font-bold font-sans text-sm tracking-wide">Evrak #{uploadQueueIndex + 1} / {uploadQueue.length}</span>
                      </div>
                      {/* Kuyruk göstergesi */}
                      <div className="flex gap-1.5">
                        {uploadQueue.map((q, i) => (
                          <div key={i} className={`w-6 h-1.5 rounded-full transition-all ${i === uploadQueueIndex ? 'bg-[#7B61FF] shadow-[0_0_6px_#7B61FF]' :
                            q.status === 'TAMAMLANDI' ? 'bg-emerald-500' :
                              q.status === 'ONAY BEKLİYOR' ? 'bg-amber-400' :
                                q.status === 'HATA' ? 'bg-red-500' :
                                  'bg-white/10'
                            }`} />
                        ))}
                      </div>
                      <button onClick={() => { setIsUploadModalOpen(false); }} className="md:hidden w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-gray-400 hover:text-white">
                        <X size={16} />
                      </button>
                    </div>

                    {/* Dosya Önizleme Alanı — Smart Magnifier */}
                    <div
                      ref={imgContainerRef}
                      className="flex-1 flex justify-center items-center p-2 md:p-4 bg-[#0A0A14] md:bg-gradient-radial md:from-[#18181B] md:to-[#0A0A14] relative overflow-hidden"
                      onMouseMove={(e) => {
                        if (!imgContainerRef.current) return;
                        const rect = imgContainerRef.current.getBoundingClientRect();
                        const x = ((e.clientX - rect.left) / rect.width) * 100;
                        const y = ((e.clientY - rect.top) / rect.height) * 100;
                        setImgZoom(prev => ({ ...prev, originX: `${x}%`, originY: `${y}%` }));
                      }}
                      onMouseEnter={() => setImgZoom(prev => ({ ...prev, hovered: true }))}
                      onMouseLeave={() => setImgZoom({ hovered: false, originX: '50%', originY: '50%' })}
                    >
                      <div className="noise-overlay opacity-20" />
                      {item.previewUrl ? (
                        <img
                          src={item.previewUrl}
                          alt={item.fileName}
                          className="max-w-full max-h-full object-contain rounded-xl shadow-[0_0_60px_rgba(0,0,0,0.9)] relative z-10 transition-transform duration-300 ease-out select-none"
                          style={{
                            transform: imgZoom.hovered ? 'scale(1.15)' : 'scale(1)',
                            transformOrigin: `${imgZoom.originX} ${imgZoom.originY}`,
                            cursor: imgZoom.hovered ? 'zoom-in' : 'default',
                          }}
                          draggable={false}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-gray-600">
                          <FileText size={64} />
                          <span className="font-data text-sm">{item.fileName}</span>
                        </div>
                      )}
                    </div>

                    {/* Dosya adı alt bar */}
                    <div className="hidden md:block px-6 py-3 border-t border-white/5 bg-[#05050A]/60">
                      <p className="text-[10px] font-data text-gray-500 uppercase tracking-widest truncate">{item.fileName}</p>
                    </div>
                  </div>

                  {/* ─── Sağ %50: Bekleme veya Form ─── */}
                  <div className="w-full flex-1 md:w-1/2 md:h-full bg-[#18181B] flex flex-col relative shadow-[0_-10px_20px_rgba(0,0,0,0.5)] md:shadow-[-30px_0_80px_rgba(0,0,0,0.8)] z-20">

                    {/* Üst Bar */}
                    <div className="flex items-center justify-between px-8 py-5 border-b border-white/5">
                      <div>
                        {isReady ? (
                          <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] uppercase font-bold font-data tracking-widest">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]" /> Analiz Tamamlandı
                          </span>
                        ) : isError ? (
                          <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-[10px] uppercase font-bold font-data tracking-widest">
                            Hata
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#7B61FF]/10 text-[#7B61FF] border border-[#7B61FF]/20 rounded-lg text-[10px] uppercase font-bold font-data tracking-widest">
                            <Loader2 size={10} className="animate-spin" /> İşleniyor
                          </span>
                        )}
                      </div>
                      <button onClick={() => setIsUploadModalOpen(false)} className="hidden md:flex w-10 h-10 bg-[#0A0A14] hover:bg-white/5 rounded-xl items-center justify-center text-gray-500 hover:text-white transition-colors border border-white/5">
                        <X size={18} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 flex flex-col">

                      {/* ─── Bekleme Animasyonu ─── */}
                      {isWaiting && !item.isTimeoutError && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-6">
                          {/* Pulse halkalar */}
                          <div className="relative flex items-center justify-center">
                            <div className="absolute w-32 h-32 rounded-full border border-[#7B61FF]/10 animate-ping" style={{ animationDuration: '2.5s' }} />
                            <div className="absolute w-24 h-24 rounded-full border border-[#7B61FF]/20 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
                            <div className="absolute w-16 h-16 rounded-full border border-[#7B61FF]/30 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.6s' }} />
                            <div className="w-12 h-12 rounded-full bg-[#7B61FF]/20 border border-[#7B61FF]/40 flex items-center justify-center shadow-[0_0_20px_rgba(123,97,255,0.4)]">
                              <Sparkles size={22} className="text-[#7B61FF] animate-pulse" />
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-white font-bold text-xl font-sans tracking-tight mb-2">Yapay Zeka Fişi Analiz Ediyor...</p>
                            <p className="text-gray-500 text-sm font-sans">Metrikleri çıkarıyor, verileri doğruluyor</p>
                          </div>
                          {/* Akan nokta animasyonu */}
                          <div className="flex gap-1.5">
                            {[0, 1, 2, 3, 4].map(i => (
                              <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#7B61FF]" style={{ animation: `bounce 1.4s ease-in-out ${i * 0.15}s infinite` }} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ─── Timeout (Zaman Aşımı) Durumu ve Yeniden Dene ─── */}
                      {item.isTimeoutError && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center px-4">
                          <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.15)] mb-2">
                            <Clock size={32} className="text-amber-400" />
                          </div>
                          <div>
                            <p className="text-amber-400 font-bold text-xl font-sans mb-2">Analiz Normalden Uzun Sürdü</p>
                            <p className="text-gray-400 text-sm font-sans leading-relaxed max-w-sm">
                              Yapay zeka çok yoğun olduğu için zaman aşımına uğradı veya bağlantı kopukluğu yaşandı.
                            </p>
                          </div>

                          <button
                            onClick={async () => {
                              // isTimeoutError state'ini sıfırla ki bekleme animasyonuna geri dönsün
                              setUploadQueue(prev => prev.map((q, idx) => idx === uploadQueueIndex ? { ...q, isTimeoutError: false } : q));

                              // Aynı istek parametreleriyle n8n tetikleyicisini beklemeli olarak tekrar çalıştır
                              await triggerWebhookSync(item.recordId, item.fileUrl, item.metrics, item.fileName);
                            }}
                            className="mt-4 relative overflow-hidden group px-8 py-3.5 bg-gradient-to-r from-amber-600 to-orange-500 text-white font-bold rounded-2xl flex items-center gap-3 shadow-[0_4px_20px_rgba(245,158,11,0.3)] hover:shadow-[0_6px_25px_rgba(245,158,11,0.5)] hover:-translate-y-1 transition-all duration-300 font-sans tracking-wide"
                          >
                            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-orange-500 to-amber-600 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out z-0" />
                            <span className="relative z-10 flex items-center gap-2">
                              <Play size={18} className="fill-white" />
                              Analizi Yeniden Tetikle
                            </span>
                          </button>

                          <p className="text-[11px] text-gray-600 mt-2 font-data uppercase tracking-widest">Dosya yeniden yüklenmez, doğrudan analiz tekrarlanır</p>
                        </div>
                      )}

                      {/* ─── Hata Durumu ─── */}
                      {isError && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                            <X size={28} className="text-red-400" />
                          </div>
                          <p className="text-white font-bold text-lg font-sans">Analiz Başarısız</p>
                          <p className="text-gray-500 text-sm font-sans">Bu evrak gönderilemedi. Webhook bağlantısını kontrol edin.</p>
                          {uploadQueueIndex + 1 < uploadQueue.length && (
                            <button onClick={() => { setUploadQueueIndex(i => i + 1); setUploadModalFormData({}); }} className="mt-4 px-6 py-3 bg-[#0A0A14] border border-white/10 text-gray-300 rounded-xl font-bold font-sans text-sm hover:border-[#7B61FF]/30 transition-colors">
                              Sıradakine Geç →
                            </button>
                          )}
                        </div>
                      )}

                      {/* ─── Veri Formu (AI tamamlandığında) ─── */}
                      {isReady && (
                        <div className="flex flex-col flex-1 gap-4">
                          <div className="mb-2">
                            <h2 className="text-2xl font-bold text-white font-sans tracking-tight">Veri Kontrolü</h2>
                            <p className="text-gray-500 text-sm font-sans mt-1">Verileri inceleyin, gerekiyorsa düzenleyin.</p>
                          </div>

                          {/* Fallback uyarısı: veriler boşken göster */}
                          {Object.values(uploadModalFormData).every(v => v === '' || v === null) && Object.keys(uploadModalFormData).length > 0 && (
                            <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/25 rounded-xl">
                              <span className="text-amber-400 text-lg leading-none mt-0.5">⚠</span>
                              <p className="text-amber-300 text-xs font-sans leading-relaxed">Yapay zeka bu fişi okuyamadı. Lütfen orijinal görsele bakarak alanları manuel olarak doldurun.</p>
                            </div>
                          )}

                          <div className="space-y-3 flex-1">
                            {Object.entries(uploadModalFormData).map(([key, value]) => (
                              <div key={key}>
                                <label className="text-[10px] font-bold text-[#7B61FF] mb-1.5 block uppercase tracking-widest font-data">{key}</label>
                                  <input
                                    type="text"
                                    value={value ?? ''}
                                    onChange={e => setUploadModalFormData(prev => ({ ...prev, [key]: e.target.value }))}
                                    className="w-full bg-[#0A0A14] border border-white/10 rounded-xl px-4 py-3 min-h-[44px] text-[#F0EFF4] font-data text-sm focus:outline-none focus:border-[#7B61FF]/50 focus:shadow-[0_0_15px_rgba(123,97,255,0.1)] transition-all shadow-inner"
                                  />
                              </div>
                            ))}
                          </div>

                          <div className="pt-4 border-t border-white/5 mt-auto">
                            <button
                              onClick={handleSaveUploadReview}
                              disabled={isUploadModalSaving}
                              className={`relative overflow-hidden group w-full py-4 rounded-2xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 font-sans tracking-widest uppercase ${isUploadModalSaving ? 'bg-[#18181B] border border-white/10 cursor-not-allowed text-gray-500' : 'bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white shadow-[0_4px_20px_rgba(168,85,247,0.4)] hover:scale-[1.02] hover:shadow-[0_6px_30px_rgba(168,85,247,0.6)]'}`}
                            >
                              {!isUploadModalSaving && <span className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 to-purple-500 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 z-0" />}
                              <span className="relative z-10 flex items-center gap-2">
                                {isUploadModalSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={3} />}
                                {isUploadModalSaving
                                  ? 'Kaydediliyor...'
                                  : uploadQueueIndex + 1 < uploadQueue.length
                                    ? `Onayla ve Sıradakine Geç (${uploadQueueIndex + 2}/${uploadQueue.length})`
                                    : 'Onayla ve Tamamla'
                                }
                              </span>
                            </button>
                            <p className="text-center text-[11px] text-gray-600 mt-3 font-sans">Kaydedilen veriler İşlem Listesine aktarılır.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
          }

          {/* ═══════ İşlem Listesi Gözden Geçirme Modalı ═══════ */}
          {
            selectedModalItem && (
              <div className="fixed inset-0 z-[100] flex bg-[#05050A]/95 backdrop-blur-xl">
                <div className="w-full h-full flex flex-col md:flex-row overflow-hidden border-t md:border-none border-white/5 shadow-2xl">

                  {/* Sol Bölüm: Orijinal Fotoğraf */}
                  <div className="w-full h-[120px] shrink-0 md:w-1/2 md:h-full bg-[#0A0A14] border-b md:border-b-0 md:border-r border-white/5 flex flex-col relative">
                    <div className="flex items-center justify-between p-3 md:p-6 border-b border-white/5 bg-[#05050A]/80 absolute top-0 w-full z-10 backdrop-blur-md">
                      <h3 className="text-white font-bold flex items-center gap-2.5 text-[12px] md:text-base font-sans tracking-wide"><Eye size={16} className="text-[#7B61FF]" /> Orijinal Evrak</h3>
                      <button onClick={() => setSelectedModalItem(null)} className="md:hidden w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                        <X size={18} />
                      </button>
                    </div>
                    <div className="flex-1 relative w-full h-full flex flex-col items-center justify-center p-2 pt-14 md:p-6 md:pt-28 overflow-hidden min-h-0 min-w-0 md:rounded-2xl bg-[#0A0A14] md:bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] md:from-[#18181B] md:to-[#0A0A14]">
                      <div className="hidden md:block noise-overlay opacity-10 pointer-events-none" />
                      {selectedModalItem.file_url ? (
                        <img src={selectedModalItem.file_url} className="block m-auto w-auto h-auto max-w-full max-h-full object-contain object-center transition-transform duration-300 ease-out hover:scale-[1.15] cursor-zoom-in relative z-10 md:drop-shadow-[0_0_20px_rgba(0,0,0,0.5)] rounded-lg md:rounded-xl" alt="Evrak" />
                      ) : (
                        <span className="text-gray-500 font-medium font-sans relative z-10">Görsel bulunamadı</span>
                      )}
                    </div>
                  </div>

                  {/* Sağ Bölüm: Düzenleme Formu */}
                  <div className="w-full flex-1 md:w-1/2 md:h-full bg-[#18181B] flex flex-col relative shadow-[0_-10px_20px_rgba(0,0,0,0.5)] md:shadow-[-20px_0_50px_rgba(0,0,0,0.8)] z-20">
                    <div className="p-6 md:p-10 flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                      <div className="flex justify-between items-start mb-8 border-b border-white/5 pb-6">
                        <div>
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[10px] uppercase font-bold mb-4 shadow-inner tracking-widest font-data">
                            <Sparkles size={14} /> Yapay Zeka Analizi Tamamlandı
                          </div>
                          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight font-sans">Veri Kontrolü</h2>
                          <p className="text-gray-400 text-sm leading-relaxed font-sans">Yapay zekanın çıkardığı verileri inceleyin.</p>
                        </div>
                        <button onClick={() => setSelectedModalItem(null)} className="hidden md:flex w-11 h-11 bg-[#0A0A14] hover:bg-white/[0.03] rounded-xl items-center justify-center text-gray-400 hover:text-white transition-all shadow-inner border border-white/5">
                          <X size={20} />
                        </button>
                      </div>

                      {/* Fallback uyarısı: veriler boşken göster */}
                      {Object.values(modalFormData).every(v => v === '' || v === null) && Object.keys(modalFormData).length > 0 && (
                        <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/25 rounded-xl mb-4">
                          <span className="text-amber-400 text-lg leading-none mt-0.5">⚠</span>
                          <p className="text-amber-300 text-xs font-sans leading-relaxed">Yapay zeka bu fişi okuyamadı. Lütfen orijinal görsele bakarak alanları manuel olarak doldurun.</p>
                        </div>
                      )}

                      <div className="space-y-4 flex-1">
                        {Object.keys(modalFormData).length > 0 ? (
                          Object.entries(modalFormData).map(([key, value]) => (
                            <div key={key}>
                              <label className="text-[10px] font-bold text-[#7B61FF] mb-2 block uppercase tracking-widest pl-1 font-data">{key}</label>
                                <input
                                  type="text"
                                  value={value ?? ''}
                                  onChange={(e) => setModalFormData(prev => ({ ...prev, [key]: e.target.value }))}
                                  className="w-full bg-[#0A0A14] border border-white/10 rounded-xl px-5 py-3.5 min-h-[44px] text-[#F0EFF4] font-data focus:outline-none focus:border-[#7B61FF]/50 focus:shadow-[0_0_15px_rgba(123,97,255,0.1)] transition-all shadow-inner"
                                />
                            </div>
                          ))
                        ) : (
                          // extracted_data tamamen boş — aktif alanlardan fallback oluştur
                          extractionFields.filter(f => f.active && f.name).map(f => (
                            <div key={f.id}>
                              <label className="text-[10px] font-bold text-[#7B61FF] mb-2 block uppercase tracking-widest pl-1 font-data">{f.name}</label>
                                <input
                                  type="text"
                                  value={modalFormData[f.name] ?? ''}
                                  onChange={(e) => setModalFormData(prev => ({ ...prev, [f.name]: e.target.value }))}
                                  className="w-full bg-[#0A0A14] border border-white/10 rounded-xl px-5 py-3.5 min-h-[44px] text-[#F0EFF4] font-data focus:outline-none focus:border-[#7B61FF]/50 focus:shadow-[0_0_15px_rgba(123,97,255,0.1)] transition-all shadow-inner"
                                />
                            </div>
                          ))
                        )}
                      </div>

                      <div className="mt-8 pt-6 border-t border-white/5">
                        <button
                          onClick={handleSaveReview}
                          disabled={isModalSaving}
                          className={`w-full relative overflow-hidden group ${isModalSaving ? 'bg-[#18181B] border border-white/10 cursor-not-allowed text-gray-400' : 'bg-[#7B61FF] text-white hover:scale-[1.03] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] shadow-[0_4px_14px_0_rgba(123,97,255,0.39)]'} font-bold py-4 md:py-5 rounded-2xl transition-all flex items-center justify-center gap-3 text-base font-sans tracking-wide`}
                        >
                          {!isModalSaving && <span className="absolute inset-0 w-full h-full bg-indigo-500 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out z-0" />}
                          <span className="relative z-10 flex items-center gap-3">
                            {isModalSaving ? <Loader2 size={24} className="animate-spin" /> : <Check size={24} strokeWidth={3} />}
                            {isModalSaving ? 'KAYDEDİLİYOR...' : 'SİSTEME KAYDET VE ONAYLA'}
                          </span>
                        </button>
                        <p className="text-center text-xs text-gray-500 mt-4 font-sans max-w-sm mx-auto">Sisteme kaydettikten sonra bu veriyi İşlem Listesi'nden tekrar düzenleyemezsiniz.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>
      </main>

      {/* ─── Yükleme Durumu İzleyici (Sadece Mobilde) [UP-02] ─── */}
      {isProcessing && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-[#05050A]/95 border-t border-white/10 backdrop-blur-xl z-[100] flex items-center gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div className="w-10 h-10 rounded-full bg-[#7B61FF]/20 flex items-center justify-center shrink-0 border border-[#7B61FF]/40">
            <Loader2 size={24} className="text-[#7B61FF] animate-spin" />
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-sm tracking-wide font-sans mb-1">Evrak(lar) Yüklenip Analiz Ediliyor...</p>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#7B61FF] to-fuchsia-500 rounded-full animate-[progress_2s_ease-in-out_infinite]" style={{ width: '70%' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// LandingPage removed and imported from ./LandingPage.jsx

function ProtectedRoute({ children, session }) {
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Giriş başarısız. Lütfen e-posta ve şifrenizi kontrol edin.");
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4 relative overflow-hidden text-white font-sans">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="absolute top-8 left-8 md:top-12 md:left-12 z-20">
        <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-blue-400 hover:drop-shadow-[0_0_8px_rgba(96,165,250,0.8)] transition-all duration-300 group">
          <ArrowLeft size={20} className="transform group-hover:-translate-x-2 transition-transform duration-300" />
          <span className="font-medium tracking-wide">Ana Sayfaya Dön</span>
        </Link>
      </div>

      <div className="glass-card w-full max-w-md p-8 relative z-10 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 shadow-[0_0_20px_#3b82f680]">
            <span className="text-white text-2xl font-bold leading-none">M</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">Sisteme Giriş Yapın</h2>
          <p className="text-gray-400 text-sm text-center">MUHASY paneline erişmek için yetkili bilgilerinizi girin.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm mb-6 flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 ml-1">E-posta Adresi</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-dark-900 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="ornek@sirket.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 ml-1">Şifre</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-dark-900 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full glow-button py-4 mt-4 text-sm flex items-center justify-center gap-2"
          >
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={session ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/dashboard" element={<ProtectedRoute session={session}><Dashboard /></ProtectedRoute>} />
    </Routes>
  );
}

export default App;
