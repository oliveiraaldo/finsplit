'use client'

import { useEffect, useState } from 'react'
import { AdminLayout } from '@/components/admin/layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from 'sonner'
import { 
  FileText, 
  Search,
  Filter,
  Calendar,
  User,
  Building2,
  Activity,
  Eye,
  AlertCircle,
  TrendingUp,
  Clock
} from 'lucide-react'

interface AuditLog {
  id: string
  action: string
  entity: string
  entityId: string | null
  details: any
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  user: {
    name: string
    email: string
  } | null
  tenant: {
    name: string
  } | null
  group: {
    name: string
  } | null
  expense: {
    description: string
    amount: number
  } | null
}

interface Stats {
  action: string
  _count: number
}

interface LogsResponse {
  logs: AuditLog[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  stats: Stats[]
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [stats, setStats] = useState<Stats[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  })
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    entity: '',
    userId: '',
    tenantId: '',
    startDate: '',
    endDate: ''
  })

  useEffect(() => {
    fetchLogs()
  }, [filters, pagination.page]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value)
        )
      })

      const response = await fetch(`/api/admin/audit-logs?${params}`)
      if (response.ok) {
        const data: LogsResponse = await response.json()
        setLogs(data.logs)
        setPagination(data.pagination)
        setStats(data.stats)
      } else {
        toast.error('Erro ao carregar logs')
      }
    } catch (error) {
      console.error('Erro ao buscar logs:', error)
      toast.error('Erro ao carregar logs')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchLogs()
  }

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'text-green-600 bg-green-50'
    if (action.includes('UPDATE')) return 'text-yellow-600 bg-yellow-50'
    if (action.includes('DELETE')) return 'text-red-600 bg-red-50'
    if (action.includes('LOGIN')) return 'text-blue-600 bg-blue-50'
    return 'text-gray-600 bg-gray-50'
  }

  const getActionIcon = (action: string) => {
    if (action.includes('CREATE')) return '➕'
    if (action.includes('UPDATE')) return '✏️'
    if (action.includes('DELETE')) return '🗑️'
    if (action.includes('LOGIN')) return '🔑'
    if (action.includes('SIGNUP')) return '👤'
    return '📝'
  }

  const formatDetails = (details: any) => {
    if (!details) return 'Sem detalhes'
    if (typeof details === 'string') return details
    if (typeof details === 'object') {
      return Object.entries(details).map(([key, value]) => 
        `${key}: ${value}`
      ).join(', ')
    }
    return JSON.stringify(details)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="h-8 w-8 text-blue-600" />
              Logs de Auditoria
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Visualize todas as ações realizadas no sistema
            </p>
          </div>
          
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total de Logs</p>
                <p className="text-2xl font-bold">{pagination.total.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Ação Mais Comum</p>
                <p className="text-xl font-bold">
                  {stats[0]?.action || 'N/A'}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Último Log</p>
                <p className="text-sm font-medium">
                  {logs[0] ? formatDate(logs[0].createdAt) : 'N/A'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filtros */}
        {showFilters && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Filtros</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Buscar</Label>
                <Input
                  id="search"
                  placeholder="Buscar em ações, entidades..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="action">Ação</Label>
                <Input
                  id="action"
                  placeholder="Ex: CREATE_USER"
                  value={filters.action}
                  onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="entity">Entidade</Label>
                <Input
                  id="entity"
                  placeholder="Ex: User, Tenant"
                  value={filters.entity}
                  onChange={(e) => setFilters(prev => ({ ...prev, entity: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="startDate">Data Inicial</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleSearch} className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Buscar
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setFilters({
                    search: '',
                    action: '',
                    entity: '',
                    userId: '',
                    tenantId: '',
                    startDate: '',
                    endDate: ''
                  })
                  setPagination(prev => ({ ...prev, page: 1 }))
                }}
              >
                Limpar
              </Button>
            </div>
          </Card>
        )}

        {/* Logs List */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Logs Recentes</h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum log encontrado</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div 
                      key={log.id} 
                      className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="text-2xl">
                            {getActionIcon(log.action)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                                {log.action}
                              </span>
                              <span className="text-sm text-gray-500">
                                {log.entity}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                              {formatDetails(log.details)}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {log.user?.name || 'Sistema'}
                              </div>
                              <div className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {log.tenant?.name || 'N/A'}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(log.createdAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Paginação */}
                {pagination.pages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t">
                    <p className="text-sm text-gray-500">
                      Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} logs
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        disabled={pagination.page === 1}
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        disabled={pagination.page === pagination.pages}
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {/* Log Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedLog(null)}>
            <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Detalhes do Log</h3>
                  <Button variant="ghost" onClick={() => setSelectedLog(null)}>
                    ✕
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Ação</Label>
                      <p className="font-medium">{selectedLog.action}</p>
                    </div>
                    <div>
                      <Label>Entidade</Label>
                      <p className="font-medium">{selectedLog.entity}</p>
                    </div>
                    <div>
                      <Label>Usuário</Label>
                      <p className="font-medium">{selectedLog.user?.name || 'Sistema'}</p>
                    </div>
                    <div>
                      <Label>Data/Hora</Label>
                      <p className="font-medium">{formatDate(selectedLog.createdAt)}</p>
                    </div>
                  </div>
                  
                  {selectedLog.tenant && (
                    <div>
                      <Label>Tenant</Label>
                      <p className="font-medium">{selectedLog.tenant.name}</p>
                    </div>
                  )}
                  
                  {selectedLog.details && (
                    <div>
                      <Label>Detalhes</Label>
                      <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-x-auto">
                        {JSON.stringify(selectedLog.details, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {selectedLog.ipAddress && (
                    <div>
                      <Label>IP Address</Label>
                      <p className="font-mono text-sm">{selectedLog.ipAddress}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
