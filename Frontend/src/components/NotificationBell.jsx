import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2 } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useInventoryLocation } from '../context/InventoryLocationContext';
import { useAuth } from '../context/AuthContext';
import RequestRejectionModal from './RequestRejectionModal';

const NotificationBell = () => {
  const navigate = useNavigate();
  const { handleInventoryChange } = useInventoryLocation();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [rejectionModalState, setRejectionModalState] = useState({ isOpen: false, request: null, rejectionReason: '' });
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationColor = (type) => {
    switch (type) {
      case 'consumable_added':
        return 'border-l-blue-500 bg-blue-50';
      case 'stock_added':
        return 'border-l-green-500 bg-green-50';
      case 'stock_removed':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'report_printed':
        return 'border-l-purple-500 bg-purple-50';
      case 'stock_requested':
        return 'border-l-teal-500 bg-teal-50';
      case 'request_approved':
        return 'border-l-emerald-500 bg-emerald-50';
      case 'request_rejected':
        return 'border-l-red-500 bg-red-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'consumable_added':
        return '📦';
      case 'stock_added':
        return '📈';
      case 'stock_removed':
        return '📉';
      case 'report_printed':
        return '🖨️';
      case 'stock_requested':
        return '📋';
      case 'request_approved':
        return '✅';
      case 'request_rejected':
        return '❌';
      default:
        return '🔔';
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now - notifDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return notifDate.toLocaleDateString();
  };

  const handleNotificationClick = async (notif) => {
    const metadata = typeof notif.metadata === 'string'
      ? (() => {
          try {
            return JSON.parse(notif.metadata)
          } catch {
            return null
          }
        })()
      : notif.metadata;

    // Mark as read
    if (!notif.isRead) {
      await markAsRead(notif.id);
    }

    // Admin stock-request notification should open Pending Requests panel.
    if (notif.type === 'stock_requested' || metadata?.target === 'pending-requests') {
      setIsOpen(false);
      navigate('/dashboard?openPendingRequests=1');
      return;
    }

    if (notif.type === 'request_rejected' && user?.role === 'staff') {
      setIsOpen(false);
      setRejectionModalState({
        isOpen: true,
        request: {
          requestId: metadata?.requestId || notif.id,
          itemName: metadata?.itemName,
          requestType: metadata?.requestType,
          quantity: metadata?.quantity,
        },
        rejectionReason: metadata?.rejectionReason || '',
      });
      return;
    }

    // Navigate to item if metadata contains itemId and track
    if (metadata && metadata.itemId && metadata.track) {
      // Set inventory location to main
      handleInventoryChange('main');
      setIsOpen(false);
      // Navigate to item
      navigate(`/inventory/${metadata.track}/${metadata.itemId}`);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative min-h-11 min-w-11 rounded-lg p-2 text-gray-600 transition-colors duration-300 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700"
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96 sm:max-w-96">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-3 rounded-t-lg dark:from-slate-900 dark:to-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="rounded bg-gray-700 px-2 py-1 text-xs transition hover:bg-gray-600"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[65vh] overflow-y-auto sm:max-h-[70vh]">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-slate-400 transition-colors duration-300">
                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-slate-700 transition-colors duration-300">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`flex cursor-pointer gap-2 border-l-4 border-l-gray-300 p-3 transition-colors duration-300 hover:bg-gray-100 dark:border-l-slate-600 dark:hover:bg-slate-700 sm:gap-3 ${
                      getNotificationColor(notif.type)
                    } ${!notif.isRead ? 'font-medium' : 'opacity-75'} dark:bg-slate-700/50`}
                  >
                    {/* Icon */}
                    <div className="mt-0.5 flex-shrink-0 text-xl sm:text-2xl">
                      {getNotificationIcon(notif.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="break-words text-xs text-gray-900 transition-colors duration-300 dark:text-slate-200 sm:text-sm">{notif.message}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 transition-colors duration-300">
                        {formatTime(notif.createdAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                      {!notif.isRead && (
                        <button
                          onClick={() => markAsRead(notif.id)}
                          className="rounded p-1.5 text-blue-600 transition hover:bg-blue-100"
                          title="Mark as read"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notif.id)}
                        className="rounded p-1.5 text-red-600 transition hover:bg-red-100"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <RequestRejectionModal
        isOpen={rejectionModalState.isOpen}
        request={rejectionModalState.request}
        rejectionReason={rejectionModalState.rejectionReason}
        onClose={() => setRejectionModalState({ isOpen: false, request: null, rejectionReason: '' })}
      />
    </div>
  );
};

export default NotificationBell;
