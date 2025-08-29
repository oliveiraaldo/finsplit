'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Plus, ArrowRight } from 'lucide-react'

interface Group {
  id: string
  name: string
  description: string
  memberCount: number
  totalExpenses: number
  lastActivity: string
}

export function GroupList() {
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await fetch('/api/dashboard/groups')
        if (response.ok) {
          const data = await response.json()
          setGroups(data)
        } else {
          console.error('Erro ao buscar grupos:', response.statusText)
        }
      } catch (error) {
        console.error('Erro ao carregar grupos:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchGroups()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Meus Grupos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-3 animate-pulse"></div>
                    <div className="flex items-center gap-4">
                      <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : groups.length > 0 ? (
          <div className="space-y-4">
            {groups.map((group) => (
              <Link key={group.id} href={`/dashboard/groups/${group.id}`}>
                <div className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{group.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                      
                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {group.memberCount} membros
                        </span>
                        <span>R$ {group.totalExpenses.toFixed(2)}</span>
                        <span>Ativo em {new Date(group.lastActivity).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                    
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhum grupo encontrado</p>
            <p className="text-sm">Crie seu primeiro grupo para começar</p>
          </div>
        )}
        
        <div className="mt-6 space-y-3">
          <Link href="/dashboard/groups" className="block">
            <button className="w-full text-center text-primary-600 hover:text-primary-700 text-sm font-medium py-2">
              Ver todos os grupos →
            </button>
          </Link>
          
          <Link href="/dashboard/groups/new" className="block">
            <button className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors">
              <Plus className="h-5 w-5" />
              Criar Novo Grupo
            </button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
} 