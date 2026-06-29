import api from './api';

// GET notifications
export const getNotifications = async (limit = 30) => {
  return await api.get(`/notifications?limit=${limit}`);
};

// unread count
export const getUnreadCount = async () => {
  const res = await api.get('/notifications/unread-count');
  return res.count;
};

// mark one as read
export const markAsRead = async (id) => {
  return await api.put(`/notifications/${id}/read`);
};

// mark all
export const markAllAsRead = async () => {
  return await api.put('/notifications/read-all');
};

// delete
export const deleteNotification = async (id) => {
  return await api.delete(`/notifications/${id}`);
};