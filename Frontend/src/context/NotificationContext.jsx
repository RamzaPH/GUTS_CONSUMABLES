import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

const DEFAULT_API_BASE_URL = 'https://guts-inventory.onrender.com/api';
const DEFAULT_SOCKET_URL = 'https://guts-inventory.onrender.com';

export const NotificationProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const onStockUpdateRef = useRef(null);

  const getApiBaseUrl = () => {
    return import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL;
  };

  const getSocketUrl = () => {
    if (import.meta.env.VITE_SOCKET_URL) {
      return import.meta.env.VITE_SOCKET_URL;
    }

    if (typeof window !== 'undefined' && window.location?.origin) {
      return DEFAULT_SOCKET_URL;
    }

    return DEFAULT_SOCKET_URL;
  };

  useEffect(() => {
    if (!user || !token) return;

    const fetchNotifications = async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/notifications`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setNotifications(data);
          const unread = data.filter((notif) => !notif.isRead).length;
          setUnreadCount(unread);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
  }, [user, token]);

  useEffect(() => {
    if (!user || !token) return;

    try {
      const socketUrl = getSocketUrl();
      const socketInstance = io(socketUrl, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      socketInstance.on('connect', () => {
        socketInstance.emit('user_connect', user.id);
      });

      socketInstance.on('new_notification', (data) => {
        setNotifications((prev) => [data, ...prev]);
        setUnreadCount((prev) => prev + 1);
      });

      socketInstance.on('stock_updated', (data) => {
        if (onStockUpdateRef.current) {
          onStockUpdateRef.current(data);
        }
      });

      socketInstance.on('history_updated', (data) => {
        // Also trigger stock update since history changes affect inventory
        if (onStockUpdateRef.current) {
          onStockUpdateRef.current(data);
        }
      });

      socketInstance.on('disconnect', () => {
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
      };
    } catch (error) {
      console.error('Socket connection error:', error);
    }
  }, [user, token]);

  const getApiUrl = () => {
    return getApiBaseUrl();
  };

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await fetch(`${getApiUrl()}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, [token]);

  const markAllAsRead = useCallback(async () => {
    try {
      await fetch(`${getApiUrl()}/notifications/read/all`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }, [token]);

  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await fetch(`${getApiUrl()}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, [token]);

  // Function to set the stock update callback - just updates the ref, not state
  const setOnStockUpdate = useCallback((callback) => {
    onStockUpdateRef.current = callback;
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        socket,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        setOnStockUpdate,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
