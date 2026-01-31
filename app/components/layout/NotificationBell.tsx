// ============================================
// Sento - Notification Bell
// Clean, minimal notification dropdown
// ============================================

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { formatLamportsToSol, formatAddress, formatRelativeTime } from '@/lib/utils/format';
import type { Invoice } from '@/types';

interface Notification {
  id: string;
  type: 'payment_received' | 'invoice_paid' | 'new_invoice';
  title: string;
  message: string;
  amount?: number;
  invoiceId?: string;
  from?: string;
  timestamp: Date;
  read: boolean;
}

export function NotificationBell() {
  const { publicKey, connected } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const previousInvoicesRef = useRef<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!publicKey || !connected) return;

    const checkNotifications = () => {
      const storedInvoices: Invoice[] = JSON.parse(localStorage.getItem('sento_invoices') || '[]');
      const userAddress = publicKey.toBase58();
      const receivedInvoices = storedInvoices.filter((inv) => inv.recipient === userAddress);
      const storedNotifications: Notification[] = JSON.parse(localStorage.getItem(`sento_notifications_${userAddress}`) || '[]');
      const newNotifications: Notification[] = [];
      
      receivedInvoices.forEach((invoice) => {
        const existingNotif = storedNotifications.find((n) => n.invoiceId === invoice.id && n.type === 'payment_received');

        if (invoice.status === 'paid' && !existingNotif) {
          newNotifications.push({
            id: `notif_${invoice.id}_paid`,
            type: 'payment_received',
            title: 'Payment Received',
            message: `You received ${formatLamportsToSol(invoice.amount)} SOL`,
            amount: invoice.amount,
            invoiceId: invoice.id,
            from: invoice.sender,
            timestamp: new Date(invoice.paidAt || new Date()),
            read: false,
          });
        }

        const existingPendingNotif = storedNotifications.find((n) => n.invoiceId === invoice.id && n.type === 'new_invoice');

        if (invoice.status === 'unpaid' && !existingPendingNotif && !previousInvoicesRef.current.has(invoice.id)) {
          newNotifications.push({
            id: `notif_${invoice.id}_new`,
            type: 'new_invoice',
            title: 'New Invoice',
            message: `${formatLamportsToSol(invoice.amount)} SOL from ${formatAddress(invoice.sender)}`,
            amount: invoice.amount,
            invoiceId: invoice.id,
            from: invoice.sender,
            timestamp: new Date(invoice.createdAt),
            read: false,
          });
        }
      });

      if (newNotifications.length > 0) {
        const allNotifications = [...newNotifications, ...storedNotifications]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 20);

        localStorage.setItem(`sento_notifications_${userAddress}`, JSON.stringify(allNotifications));
        setNotifications(allNotifications);
      } else {
        setNotifications(storedNotifications);
      }

      receivedInvoices.forEach((inv) => previousInvoicesRef.current.add(inv.id));
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 5000);
    return () => clearInterval(interval);
  }, [publicKey, connected]);

  const markAsRead = (notifId: string) => {
    if (!publicKey) return;
    const updated = notifications.map((n) => n.id === notifId ? { ...n, read: true } : n);
    setNotifications(updated);
    localStorage.setItem(`sento_notifications_${publicKey.toBase58()}`, JSON.stringify(updated));
  };

  const markAllAsRead = () => {
    if (!publicKey) return;
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem(`sento_notifications_${publicKey.toBase58()}`, JSON.stringify(updated));
  };

  const clearAll = () => {
    if (!publicKey) return;
    setNotifications([]);
    localStorage.setItem(`sento_notifications_${publicKey.toBase58()}`, '[]');
    setIsOpen(false);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!connected) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-md text-[#5F6167] hover:text-[#F4F4F5] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-[#5BB98C] text-[#0A0B0C] text-[10px] font-semibold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl bg-[#1A1C1E] border border-[rgba(255,255,255,0.08)] shadow-[0_8px_24px_rgba(0,0,0,0.5)] overflow-hidden z-50">
          <div className="p-4 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
            <h3 className="text-[14px] font-medium text-[#F4F4F5]">Notifications</h3>
            {notifications.length > 0 && (
              <div className="flex items-center gap-3">
                <button onClick={markAllAsRead} className="text-[11px] text-[#5F6167] hover:text-[#F4F4F5] transition-colors">
                  Mark all read
                </button>
                <button onClick={clearAll} className="text-[11px] text-[#5F6167] hover:text-[#D45353] transition-colors">
                  Clear
                </button>
              </div>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[rgba(255,255,255,0.04)] flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#3A3C40]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                </div>
                <p className="text-[13px] text-[#5F6167]">No notifications</p>
                <p className="text-[11px] text-[#3A3C40] mt-1">Payment updates will appear here</p>
              </div>
            ) : (
              <div>
                {notifications.map((notif, index) => (
                  <Link
                    key={notif.id}
                    href={notif.invoiceId ? `/invoice/${notif.invoiceId}` : '/balance'}
                    onClick={() => { markAsRead(notif.id); setIsOpen(false); }}
                    className={`block p-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors ${index !== 0 ? 'border-t border-[rgba(255,255,255,0.04)]' : ''} ${!notif.read ? 'bg-[rgba(91,185,140,0.02)]' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        notif.type === 'payment_received' ? 'bg-[rgba(91,185,140,0.1)]' : 
                        notif.type === 'new_invoice' ? 'bg-[rgba(91,139,212,0.1)]' : 'bg-[rgba(212,160,83,0.1)]'
                      }`}>
                        {notif.type === 'payment_received' ? (
                          <svg className="w-4 h-4 text-[#5BB98C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        ) : notif.type === 'new_invoice' ? (
                          <svg className="w-4 h-4 text-[#5B8BD4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-[#D4A053]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-[13px] ${!notif.read ? 'text-[#F4F4F5] font-medium' : 'text-[#94959C]'}`}>
                            {notif.title}
                          </p>
                          {!notif.read && <span className="w-1.5 h-1.5 bg-[#5BB98C] rounded-full flex-shrink-0" />}
                        </div>
                        <p className="text-[12px] text-[#5F6167] truncate">{notif.message}</p>
                        <p className="text-[11px] text-[#3A3C40] mt-1">{formatRelativeTime(new Date(notif.timestamp))}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-[rgba(255,255,255,0.06)]">
              <Link href="/balance" onClick={() => setIsOpen(false)} className="block text-center text-[12px] text-[#5F6167] hover:text-[#F4F4F5] transition-colors py-1">
                View all activity →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
