import { useState, useEffect } from 'react'
import { X, Trash2, Edit2, Plus, RotateCcw } from 'lucide-react'
import Button from './Button'
import { useToast } from '../context/ToastContext'
import AddUserModal from './AddUserModal'
import { getUsers, deleteUser, restoreUser } from '../api/authApi'

const UserManagementModal = ({ isOpen, onClose }) => {
  const { success, error: showError, warning } = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
    }
  }, [isOpen])

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getUsers()
      setUsers(data.users || [])
    } catch (err) {
      setError('Failed to load users. Please try again.')
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter((user) => {
    if (statusFilter === 'active') return user.isActive
    if (statusFilter === 'archived') return !user.isActive
    return true
  })

  const handleAddUser = () => {
    setEditingUser(null)
    setIsAddUserOpen(true)
  }

  const handleEditUser = (user) => {
    setEditingUser(user)
    setIsAddUserOpen(true)
  }

  const handleAddUserSuccess = (fullName, role) => {
    setTimeout(() => {
      const actionText = editingUser ? 'User updated' : 'User created'
      success(`${actionText} successfully!`)
      fetchUsers()
    }, 500)
  }

  const handleArchiveUser = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to archive user "${userName}"? They can be restored later.`)) {
      try {
        await deleteUser(userId)
        success(`User "${userName}" has been archived.`)
        fetchUsers()
      } catch (error) {
        const errorMsg = error.response?.data?.error || 'Failed to archive user'
        showError(`Error: ${errorMsg}`)
      }
    }
  }

  const handleRestoreUser = async (userId, userName) => {
    try {
      await restoreUser(userId)
      success(`User "${userName}" has been restored.`)
      fetchUsers()
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to restore user'
      showError(`Error: ${errorMsg}`)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-3 sm:items-center sm:p-4">
        <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
          {/* Header */}
          <div className="sticky top-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-title text-lg font-bold text-slate-800">
              User Management
              </h2>
              <div className="flex items-center gap-2">
              <Button
                className="flex items-center gap-2 bg-[var(--brand-primary)] px-3 py-2 text-xs hover:bg-[var(--brand-primary-strong)] sm:px-4 sm:text-sm"
                onClick={handleAddUser}
              >
                <Plus className="h-4 w-4" />
                Add User
              </Button>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === 'all'
                    ? 'bg-[var(--brand-primary)] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Users
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === 'active'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('archived')}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === 'archived'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Archived
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-8 text-slate-600">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-slate-600">No users found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Full Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Username</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Role</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">Status</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-900 font-medium">{user.fullName}</td>
                        <td className="px-4 py-3 text-slate-600">{user.username}</td>
                        <td className="px-4 py-3 text-slate-600">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                            user.role === 'admin'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                            user.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? 'Active' : 'Archived'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit user"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            {user.isActive ? (
                              <button
                                onClick={() => handleArchiveUser(user.id, user.fullName)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Archive user"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRestoreUser(user.id, user.fullName)}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Restore user"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      <AddUserModal
        isOpen={isAddUserOpen}
        onClose={() => {
          setIsAddUserOpen(false)
          setEditingUser(null)
        }}
        onSuccess={handleAddUserSuccess}
        editingUser={editingUser}
      />
    </>
  )
}

export default UserManagementModal
