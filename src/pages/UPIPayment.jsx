import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CheckCircle2, Clock3, Copy, IndianRupee, Phone, QrCode, RotateCcw, Upload } from 'lucide-react';
import jsQR from 'jsqr';
import { QRCodeCanvas } from 'qrcode.react';
import { Capacitor } from '@capacitor/core';
import UPIPlugin from '../plugins/upi';
import { addExpense } from '../features/expenses/expenseSlice';
import { fetchNotifications } from '../features/notifications/notificationSlice';
import { expenseAPI } from '../api/expense.api';
import { paymentAPI } from '../api/payment.api';
import { Button, Input, Select } from '../components/ui/index';
import { formatCurrency, parseMoneyInput, timeAgo } from '../utils/formatters';
import { CATEGORIES } from '../constants/categories';
import toast from 'react-hot-toast';

const UPI_ID_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-_]{2,64}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const PENDING_UPI_KEY = 'srfinix_pending_upi_payment';
const MANUAL_UPI_PAYEE = { pa: 'manual@upi', pn: 'Manual UPI Payment', source: 'manual' };

const QUICK_AMOUNTS = [100, 250, 500, 1000];

const parseUPIUri = (value) => {
  try {
    const normalized = value.trim();
    if (!normalized.toLowerCase().startsWith('upi://pay')) return null;
    const url = new URL(normalized.replace(/^upi:\/\/pay/i, 'https://upi.local/pay'));
    return {
      pa: url.searchParams.get('pa') || '',
      pn: url.searchParams.get('pn') || '',
      am: url.searchParams.get('am') || '',
      tn: url.searchParams.get('tn') || '',
      cu: url.searchParams.get('cu') || 'INR',
      source: 'qr',
    };
  } catch {
    return null;
  }
};

const normalizeUPIData = (value) => {
  const input = value.trim();
  const parsed = parseUPIUri(input);
  if (parsed) return parsed;
  if (UPI_ID_REGEX.test(input)) {
    return { pa: input, pn: input.split('@')[0], am: '', tn: '', cu: 'INR', source: 'upi-id' };
  }
  return null;
};

const makeContactUPIData = (phone) => ({
  pa: `${phone}@upi`,
  pn: phone,
  am: '',
  tn: '',
  cu: 'INR',
  source: 'contact',
  phone,
});

const cleanUPIText = (value, fallback = '') => (
  String(value || fallback)
    .replace(/[^\w\s.@-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50)
);

const makeUPIQuery = (data, { includeAmount = true } = {}) => {
  const params = new URLSearchParams();
  params.set('pa', cleanUPIText(data.pa));
  params.set('pn', cleanUPIText(data.pn, data.pa));
  if (includeAmount && validateAmountOnly(data.am)) {
    params.set('am', String(parseMoneyInput(data.am).toFixed(2)));
  }
  params.set('cu', 'INR');
  params.set('tn', cleanUPIText(data.tn, 'SRFiniX payment'));
  return params.toString();
};

const makeUPILink = (data, options) => `upi://pay?${makeUPIQuery(data, options)}`;

const makeAndroidIntentLink = (data, options) => {
  const query = makeUPIQuery(data, options);
  return `intent://pay?${query}#Intent;scheme=upi;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`;
};

const makeGenericUPILink = () => 'upi://pay';

const makeGenericAndroidIntentLink = () => (
  'intent://pay#Intent;scheme=upi;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end'
);

const makeP2PUPIData = (data, details) => ({
  pa: data.pa,
  pn: data.pn || data.pa.split('@')[0],
  am: parseMoneyInput(details.amount),
  tn: details.description || 'SRFiniX payment',
});

const makeNativeUPIPayload = (data, { includeAmount = true } = {}) => ({
  upiId: cleanUPIText(data.pa),
  name: cleanUPIText(data.pn, data.pa),
  amount: includeAmount && validateAmountOnly(data.am) ? String(parseMoneyInput(data.am).toFixed(2)) : '',
  note: cleanUPIText(data.tn, 'SRFiniX payment'),
});

const makePendingPayment = (upiData, expense, selectedAppName) => ({
  upiData,
  expense,
  selectedAppName,
  launchedAt: Date.now(),
});

const validateAmountOnly = (amount) => {
  const value = parseMoneyInput(amount);
  return Number.isFinite(value) && value > 0;
};

const loadRazorpayCheckout = () => new Promise((resolve, reject) => {
  if (window.Razorpay) {
    resolve(true);
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(true);
  script.onerror = () => reject(new Error('Unable to load Razorpay Checkout.'));
  document.body.appendChild(script);
});

const openUPILink = async ({ upiLink, browserIntentLink }) => {
  const anchor = document.createElement('a');
  anchor.href = browserIntentLink || upiLink;
  anchor.target = '_self';
  anchor.rel = 'noopener noreferrer';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  if (browserIntentLink) {
    window.setTimeout(() => {
      if (document.visibilityState === 'visible') {
        const fallbackAnchor = document.createElement('a');
        fallbackAnchor.href = upiLink;
        fallbackAnchor.target = '_self';
        fallbackAnchor.rel = 'noopener noreferrer';
        fallbackAnchor.style.display = 'none';
        document.body.appendChild(fallbackAnchor);
        fallbackAnchor.click();
        fallbackAnchor.remove();
      }
    }, 900);
  }
};

export default function UPIPayment() {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);

  const [step, setStep] = useState('record');
  const [manualInput, setManualInput] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [upiData, setUpiData] = useState(null);
  const [payerUpiId, setPayerUpiId] = useState('');
  const [scanStatus, setScanStatus] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isGatewayPaying, setIsGatewayPaying] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expense, setExpense] = useState({ amount: '', category: 'food', description: '' });

  const paymentPayload = upiData && validateAmountOnly(expense.amount) ? makeP2PUPIData(upiData, expense) : null;
  const upiQrValue = paymentPayload ? makeUPILink(paymentPayload, { includeAmount: false }) : '';
  const pendingQrPayload = pendingPayment ? makeP2PUPIData(pendingPayment.upiData, pendingPayment.expense) : null;
  const pendingQrValue = pendingQrPayload ? makeUPILink(pendingQrPayload, { includeAmount: false }) : upiQrValue;

  const loadPaymentHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data } = await expenseAPI.getAll({ limit: 50 });
      setPaymentHistory((data.expenses || []).filter((item) => item.paymentMethod === 'upi' || item.upiId));
    } catch {
      setPaymentHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const stopLiveScanner = () => {
    if (scanTimerRef.current) window.clearInterval(scanTimerRef.current);
    scanTimerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsScanning(false);
  };

  useEffect(() => {
    loadPaymentHistory();
    const stored = sessionStorage.getItem(PENDING_UPI_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPendingPayment(parsed);
        setUpiData(parsed.upiData);
        setExpense(parsed.expense);
        setStep('returnConfirm');
      } catch {
        sessionStorage.removeItem(PENDING_UPI_KEY);
      }
    }

    return () => stopLiveScanner();
  }, []);

  const setPaymentData = (data) => {
    stopLiveScanner();
    setUpiData(data);
    setExpense((current) => ({
      ...current,
      amount: data.am || current.amount,
      description: data.tn || data.pn || current.description,
    }));
    setStep('confirm');
  };

  const handleManualUPI = () => {
    const data = normalizeUPIData(manualInput);
    if (!data || !UPI_ID_REGEX.test(data.pa)) {
      toast.error('Enter a valid UPI ID or UPI QR link.');
      return;
    }
    setPaymentData(data);
  };

  const handleContactPay = () => {
    const phone = contactNumber.replace(/\D/g, '');
    if (!PHONE_REGEX.test(phone)) {
      toast.error('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setPaymentData(makeContactUPIData(phone));
  };

  const decodeCanvasQRCode = (canvas) => {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context || canvas.width === 0 || canvas.height === 0) return null;
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
    return code?.data || null;
  };

  const scanImageForQR = async (file) => {
    if (!file) return;
    setScanStatus('Scanning QR image...');

    try {
      const bitmap = await createImageBitmap(file);
      const canvas = canvasRef.current || document.createElement('canvas');
      const maxSize = 1400;
      const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      const value = decodeCanvasQRCode(canvas);
      const data = value ? normalizeUPIData(value) : null;

      if (!data || !UPI_ID_REGEX.test(data.pa)) {
        toast.error('No valid UPI QR found in that image.');
        setScanStatus('');
        return;
      }

      toast.success('UPI QR detected.');
      setScanStatus('');
      setPaymentData(data);
    } catch {
      setScanStatus('');
      toast.error('Could not scan that QR image.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startLiveScanner = async () => {
    if (!window.isSecureContext) {
      toast.error('Open HTTPS on your phone to use live QR scanning.');
      setScanStatus('Live scanner needs HTTPS. Use https://192.168.0.249:5173 on mobile.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Camera is not available in this browser.');
      setScanStatus('Use Chrome and allow camera permission, or use Upload for saved QR images.');
      return;
    }

    try {
      stopLiveScanner();
      setIsScanning(true);
      setScanStatus('Opening camera...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;

      if (!videoRef.current) {
        throw new Error('Camera preview is not ready.');
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setScanStatus('Point camera at a UPI QR code...');

      scanTimerRef.current = window.setInterval(() => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const video = videoRef.current;
          const canvas = canvasRef.current || document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const value = decodeCanvasQRCode(canvas);
          const data = value ? normalizeUPIData(value) : null;
          if (data && UPI_ID_REGEX.test(data.pa)) {
            toast.success('UPI QR detected.');
            setScanStatus('');
            setPaymentData(data);
          }
        } catch {
          // Keep scanning; camera frames can transiently fail.
        }
      }, 700);
    } catch {
      toast.error('Camera permission denied or unavailable.');
      setScanStatus('');
      stopLiveScanner();
    }
  };

  const validatePayment = () => {
    const amount = parseMoneyInput(expense.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid payment amount.');
      return false;
    }
    if (amount > 100000) {
      toast.error('Amount is above the usual UPI per-transaction limit.');
      return false;
    }
    return true;
  };

  const launchNativeUPIChooser = async () => {
    if (!validatePayment()) return;

    const payment = makePendingPayment(upiData || MANUAL_UPI_PAYEE, expense, 'manual UPI payment');
    const upiLink = makeGenericUPILink();
    const browserIntentLink = makeGenericAndroidIntentLink();

    setPendingPayment(payment);
    sessionStorage.setItem(PENDING_UPI_KEY, JSON.stringify(payment));
    setStep('processing');
    toast.success('Open your UPI app and complete the payment manually.');

    try {
      if (Capacitor.isNativePlatform()) {
        await UPIPlugin.pay({ upiId: '', name: 'Manual UPI Payment', amount: '', note: '' });
        setStep('returnConfirm');
        return;
      }

      await openUPILink({ upiLink, browserIntentLink });
    } catch {
      toast.error('Could not open UPI app. Open your UPI app manually, then return here.');
      setStep('processing');
    }
  };

  const launchVerifiedUPIPayment = async () => {
    if (!validatePayment()) return;
    const normalizedPayerUpiId = payerUpiId.trim();
    if (normalizedPayerUpiId && !UPI_ID_REGEX.test(normalizedPayerUpiId)) {
      toast.error('Enter a valid payer UPI ID or leave it empty.');
      return;
    }

    setIsGatewayPaying(true);
    try {
      await loadRazorpayCheckout();

      const expensePayload = {
        amount: parseMoneyInput(expense.amount),
        category: expense.category,
        description: expense.description || 'UPI Payment',
        notes: 'Verified through Razorpay Checkout',
        payerUpiId: normalizedPayerUpiId,
      };

      const { data } = await paymentAPI.createRazorpayOrder(expensePayload);

      if (!data.keyId || !data.order?.id) {
        toast.error('Payment gateway is not configured.');
        return;
      }

      const options = {
        key: data.keyId,
        amount: data.order.amount,
        currency: data.order.currency,
        name: 'SRFiniX',
        description: expensePayload.description,
        order_id: data.order.id,
        prefill: normalizedPayerUpiId ? { vpa: normalizedPayerUpiId } : {},
        method: {
          upi: true,
          card: false,
          netbanking: false,
          wallet: false,
          emi: false,
          paylater: false,
        },
        handler: async (response) => {
          setIsGatewayPaying(true);
          const verified = await paymentAPI.verifyRazorpayPayment({
            ...response,
            expense: expensePayload,
          });

          sessionStorage.removeItem(PENDING_UPI_KEY);
          setPendingPayment(null);
          dispatch(fetchNotifications());
          loadPaymentHistory();
          toast.success('Payment verified and saved.');
          setStep('done');
          return verified;
        },
        modal: {
          ondismiss: () => {
            toast('Payment was not completed.');
          },
        },
        theme: {
          color: '#00E5A0',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', (response) => {
        toast.error(response.error?.description || 'Payment failed.');
      });
      razorpay.open();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Could not start payment.');
    } finally {
      setIsGatewayPaying(false);
    }
  };

  const showPaymentQR = () => {
    if (!validatePayment()) return;
    const payment = makePendingPayment(upiData, expense, 'UPI QR scan');
    setPendingPayment(payment);
    sessionStorage.setItem(PENDING_UPI_KEY, JSON.stringify(payment));
    setStep('qrPay');
  };

  useEffect(() => {
    const showReturnConfirmation = () => {
      if (!pendingPayment || isRecording) return;
      if (Date.now() - pendingPayment.launchedAt < 1200) return;
      setStep('returnConfirm');
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') showReturnConfirmation();
    };

    window.addEventListener('focus', showReturnConfirmation);
    window.addEventListener('pageshow', showReturnConfirmation);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', showReturnConfirmation);
      window.removeEventListener('pageshow', showReturnConfirmation);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pendingPayment, isRecording]);

  const recordPayment = async (payment = null) => {
    const data = payment?.upiData || upiData;
    const details = payment?.expense || expense;
    const appName = payment?.selectedAppName || 'UPI';
    const amount = parseMoneyInput(details.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Payment details are incomplete.');
      return false;
    }

    setIsRecording(true);
    const res = await dispatch(addExpense({
      amount,
      category: details.category,
      description: details.description || data.pn || 'UPI Payment',
      notes: `Recorded after ${appName}`,
      paymentMethod: 'upi',
      upiId: data?.source === 'manual' ? '' : data?.pa,
      isAutoAdded: true,
    }));
    setIsRecording(false);

    if (addExpense.fulfilled.match(res)) {
      sessionStorage.removeItem(PENDING_UPI_KEY);
      setPendingPayment(null);
      dispatch(fetchNotifications());
      loadPaymentHistory();
      toast.success('Payment stored in expenses.');
      setStep('done');
      return true;
    }

    toast.error(res.payload || 'Failed to record payment.');
    return false;
  };

  const cancelPendingPayment = () => {
    sessionStorage.removeItem(PENDING_UPI_KEY);
    setPendingPayment(null);
    setStep('confirm');
    toast('Payment was not recorded.');
  };

  const handleCopyLink = async () => {
    if (!validatePayment()) return;
    const link = makeUPILink(makeP2PUPIData(upiData, expense), { includeAmount: false });
    await navigator.clipboard.writeText(link);
    toast.success('UPI payment link copied.');
  };

  const reset = () => {
    stopLiveScanner();
    setStep('record');
    setManualInput('');
    setContactNumber('');
    setPayerUpiId('');
    setUpiData(null);
    setScanStatus('');
    setPendingPayment(null);
    sessionStorage.removeItem(PENDING_UPI_KEY);
    setExpense({ amount: '', category: 'food', description: '' });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 md:space-y-5 touch-pan-y">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold md:text-2xl">UPI Pay</h2>
          <p className="mt-0.5 text-sm text-text-secondary">Scan QR, pay by UPI app, and store payment history.</p>
        </div>
        {step !== 'record' && (
          <button
            onClick={reset}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-bg-secondary text-text-secondary"
            aria-label="Start over"
          >
            <RotateCcw size={18} />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {step === 'scan' && (
          <motion.div key="scan" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <section className="card overflow-hidden">
              <div className="relative mx-auto flex aspect-square max-w-[280px] items-center justify-center overflow-hidden rounded-[28px] border border-accent-green/20 bg-bg-tertiary">
                <video
                  ref={videoRef}
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${isScanning ? 'opacity-100' : 'opacity-0'}`}
                  muted
                  autoPlay
                  playsInline
                />
                {!isScanning && (
                  <>
                    <div className="absolute inset-5 rounded-[22px] border border-dashed border-accent-green/30" />
                    <div className="absolute left-8 right-8 top-1/2 h-0.5 -translate-y-1/2 bg-accent-green/70 shadow-[0_0_18px_rgba(0,229,160,0.55)]" />
                    <QrCode size={84} className="text-accent-green/70" />
                  </>
                )}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <Button onClick={startLiveScanner} className="justify-center" size="lg">
                  <Camera size={18} /> Scan
                </Button>
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="justify-center" size="lg">
                  <Upload size={18} /> Upload
                </Button>
                <Button variant="secondary" onClick={stopLiveScanner} className="justify-center" size="lg">
                  Stop
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => scanImageForQR(event.target.files?.[0])}
              />
              <canvas ref={canvasRef} className="hidden" />
              <p className="mt-3 text-center text-xs text-text-muted">
                {scanStatus || 'If camera permission is blocked, use Upload or paste the UPI QR link.'}
              </p>
            </section>

            <section className="card space-y-3">
              <h3 className="font-display text-base font-semibold">Pay by UPI ID or QR Link</h3>
              <Input
                label="UPI ID or UPI QR Link"
                value={manualInput}
                onChange={(event) => setManualInput(event.target.value)}
                placeholder="merchant@upi or upi://pay?pa=..."
                inputMode="email"
              />
              <Button onClick={handleManualUPI} className="w-full justify-center" size="lg">Continue</Button>
              <button
                onClick={() => setManualInput('upi://pay?pa=swiggy@upi&pn=Swiggy&am=480&tn=Food Order')}
                className="text-xs font-medium text-accent-green"
              >
                Use demo UPI link
              </button>
            </section>

            <section className="card space-y-3">
              <h3 className="flex items-center gap-2 font-display text-base font-semibold">
                <Phone size={18} /> Pay by Contact Number
              </h3>
              <Input
                label="Mobile Number"
                value={contactNumber}
                onChange={(event) => setContactNumber(event.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                inputMode="numeric"
                maxLength={10}
              />
              <p className="text-xs text-text-muted">
                Uses UPI Number format as <span className="font-mono">mobile@upi</span>. This depends on whether the receiver has enabled UPI Number.
              </p>
              <Button onClick={handleContactPay} className="w-full justify-center" size="lg">Continue with Contact</Button>
            </section>
          </motion.div>
        )}

        {(step === 'record' || (step === 'confirm' && upiData)) && (
          <motion.div key="record" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <section className="card">
              {upiData ? (
                <div className="rounded-3xl bg-gradient-to-br from-bg-tertiary to-bg-card p-4">
                  <p className="text-xs uppercase tracking-wide text-text-muted">Optional payee</p>
                  <h3 className="mt-1 truncate font-display text-xl font-bold">{upiData.pn || upiData.pa}</h3>
                  <p className="mt-1 break-all font-mono text-xs text-text-secondary">{upiData.pa}</p>
                </div>
              ) : (
                <div className="rounded-3xl bg-gradient-to-br from-bg-tertiary to-bg-card p-4">
                  <p className="text-xs uppercase tracking-wide text-text-muted">Manual UPI record</p>
                  <h3 className="mt-1 font-display text-xl font-bold">Enter payment details</h3>
                  <p className="mt-1 text-sm text-text-secondary">SRFiniX will only save the record after you confirm payment.</p>
                </div>
              )}

              <div className="mt-5 space-y-4">
                <div>
                  <label className="label">Amount</label>
                  <div className="flex items-center rounded-2xl border border-white/[0.07] bg-bg-tertiary px-4 py-3 focus-within:border-accent-green/50">
                    <IndianRupee size={20} className="mr-2 text-text-muted" />
                    <input
                      type="number"
                      min="1"
                      max="100000"
                      value={expense.amount}
                      onChange={(event) => setExpense((current) => ({ ...current, amount: event.target.value }))}
                      placeholder="0"
                      className="w-full bg-transparent font-display text-3xl font-bold text-text-primary outline-none placeholder:text-text-muted"
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {QUICK_AMOUNTS.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setExpense((current) => ({ ...current, amount: String(amount) }))}
                        className="rounded-xl border border-white/[0.07] bg-bg-tertiary py-2 text-xs font-semibold text-text-secondary"
                      >
                        Rs {amount}
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  label="Description"
                  value={expense.description}
                  onChange={(event) => setExpense((current) => ({ ...current, description: event.target.value }))}
                  placeholder="What did you pay for?"
                />

                <Select label="Category" value={expense.category} onChange={(event) => setExpense((current) => ({ ...current, category: event.target.value }))}>
                  {Object.entries(CATEGORIES).map(([key, category]) => (
                    <option key={key} value={key}>{category.icon} {category.label}</option>
                  ))}
                </Select>

                <Input
                  label="Payer UPI ID"
                  value={payerUpiId}
                  onChange={(event) => setPayerUpiId(event.target.value)}
                  placeholder="saran@oksbi"
                  inputMode="email"
                />
                <p className="text-xs text-text-muted">
                  Used for UPI collect/prefill where the gateway supports it. The payer approves inside their UPI app.
                </p>
              </div>
            </section>

            <div className={`sticky bottom-24 z-10 gap-3 md:static ${upiData ? 'grid grid-cols-[auto_1fr_1fr]' : 'grid'}`}>
              {upiData && (
                <>
                  <Button variant="secondary" onClick={handleCopyLink} className="px-4">
                    <Copy size={18} />
                  </Button>
                  <Button variant="secondary" onClick={showPaymentQR} size="lg" className="justify-center">
                    <QrCode size={18} /> Show QR
                  </Button>
                </>
              )}
              <Button onClick={launchVerifiedUPIPayment} loading={isGatewayPaying} size="lg" className="justify-center shadow-xl shadow-accent-green/10">
                Pay & Auto Save
              </Button>
              {!upiData && (
                <Button variant="secondary" onClick={launchNativeUPIChooser} size="lg" className="justify-center">
                  Manual Pay
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {step === 'qrPay' && pendingPayment && (
          <motion.section key="qrPay" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card space-y-5 text-center">
            <div>
              <h3 className="font-display text-xl font-bold">Scan This UPI QR</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-text-secondary">
                Open any UPI app on another phone, scan this QR, enter the amount, complete payment, then save it here.
              </p>
            </div>

            <div className="mx-auto w-fit rounded-[28px] bg-white p-4 shadow-xl shadow-black/20">
              {pendingQrValue ? (
                <QRCodeCanvas value={pendingQrValue} size={236} level="M" includeMargin />
              ) : (
                <div className="flex h-[236px] w-[236px] items-center justify-center text-sm text-slate-500">QR unavailable</div>
              )}
            </div>

            <div className="rounded-2xl bg-bg-tertiary p-4">
              <p className="text-xs text-text-muted">Amount</p>
              <p className="font-display text-2xl font-bold text-accent-green">{formatCurrency(parseMoneyInput(pendingPayment.expense.amount))}</p>
              <p className="mt-1 break-all text-xs text-text-secondary">to {pendingPayment.upiData.pn || pendingPayment.upiData.pa}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={cancelPendingPayment} className="justify-center">Cancel</Button>
              <Button onClick={() => setStep('returnConfirm')} className="justify-center">I Paid</Button>
            </div>
          </motion.section>
        )}

        {step === 'processing' && pendingPayment && (
          <motion.section key="processing" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card py-10 text-center">
            <Clock3 className="mx-auto mb-4 text-accent-green" size={56} />
            <h3 className="font-display text-xl font-bold">Complete Payment</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-text-secondary">
              Complete the payment manually in your UPI app by scanning or entering details, then return to SRFiniX.
            </p>
            <div className="mt-5 rounded-2xl bg-bg-tertiary p-4">
              <p className="text-xs text-text-muted">Amount</p>
              <p className="font-display text-2xl font-bold text-accent-green">{formatCurrency(parseMoneyInput(pendingPayment.expense.amount))}</p>
              <p className="mt-1 break-all text-xs text-text-secondary">{pendingPayment.expense.description || 'Manual UPI payment'}</p>
            </div>
            <Button onClick={() => setStep('returnConfirm')} className="mx-auto mt-6">
              I returned from UPI app
            </Button>
          </motion.section>
        )}

        {step === 'returnConfirm' && pendingPayment && (
          <motion.section key="returnConfirm" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card py-10 text-center">
            <CheckCircle2 className="mx-auto mb-4 text-accent-green" size={56} />
            <h3 className="font-display text-xl font-bold">Confirm Payment</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-text-secondary">
              Did you complete this UPI payment successfully?
            </p>
            <div className="mt-5 rounded-2xl bg-bg-tertiary p-4">
              <p className="font-display text-2xl font-bold text-accent-green">{formatCurrency(parseMoneyInput(pendingPayment.expense.amount))}</p>
              <p className="mt-1 break-all text-xs text-text-secondary">{pendingPayment.expense.description || 'Manual UPI payment'}</p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={cancelPendingPayment} className="justify-center">Not Paid</Button>
              <Button onClick={() => recordPayment(pendingPayment)} loading={isRecording} className="justify-center">Paid, Save</Button>
            </div>
          </motion.section>
        )}

        {step === 'done' && (
          <motion.section key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card py-12 text-center">
            <CheckCircle2 className="mx-auto mb-4 text-accent-green" size={64} />
            <h3 className="font-display text-xl font-bold">Payment Saved</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm text-text-secondary">
              Your UPI payment was stored in expenses and payment history.
            </p>
            <Button onClick={reset} className="mx-auto mt-6">Make Another Payment</Button>
          </motion.section>
        )}
      </AnimatePresence>

      <section className="card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold">UPI Payment History</h3>
            <p className="text-xs text-text-muted">Confirmed UPI transactions stored in expenses</p>
          </div>
          <Button variant="secondary" size="sm" onClick={loadPaymentHistory}>Refresh</Button>
        </div>

        {historyLoading ? (
          <p className="py-6 text-center text-sm text-text-muted">Loading history...</p>
        ) : paymentHistory.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">No UPI payments recorded yet.</p>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {paymentHistory.slice(0, 8).map((payment) => (
              <div key={payment._id} className="flex items-center gap-3 py-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-green/10 text-accent-green">
                  <IndianRupee size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{payment.description || 'UPI Payment'}</p>
                  <p className="truncate text-xs text-text-muted">{payment.upiId || 'UPI'} - {timeAgo(payment.createdAt)}</p>
                </div>
                <p className="font-display text-sm font-bold text-accent-green">{formatCurrency(payment.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
