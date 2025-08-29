import { MemberRole, MemberPermission } from '@prisma/client'

export interface UserGroupContext {
  userId: string
  groupId: string
  role: MemberRole
  permission: MemberPermission
  isOwner: boolean
  ownerTenantId: string
  userTenantId: string
}

export class PermissionChecker {
  private context: UserGroupContext

  constructor(context: UserGroupContext) {
    this.context = context
  }

  // Verificar se pode visualizar o grupo
  canViewGroup(): boolean {
    return true // Todos os membros podem visualizar
  }

  // Verificar se pode visualizar despesas
  canViewExpenses(): boolean {
    return true // Todos os membros podem visualizar despesas
  }

  // Verificar se pode criar despesas
  canCreateExpense(): boolean {
    // FULL_ACCESS permite criar, ou ser OWNER/ADMIN
    return (
      this.context.permission === 'FULL_ACCESS' ||
      this.context.role === 'OWNER' ||
      this.context.role === 'ADMIN'
    )
  }

  // Verificar se pode editar uma despesa específica
  canEditExpense(expenseOwnerId?: string): boolean {
    // OWNER e ADMIN podem editar qualquer despesa
    if (this.context.role === 'OWNER' || this.context.role === 'ADMIN') {
      return true
    }

    // FULL_ACCESS pode editar qualquer despesa
    if (this.context.permission === 'FULL_ACCESS') {
      return true
    }

    // VIEW_ONLY pode editar apenas suas próprias despesas
    if (this.context.permission === 'VIEW_ONLY' && expenseOwnerId) {
      return this.context.userId === expenseOwnerId
    }

    return false
  }

  // Verificar se pode excluir uma despesa
  canDeleteExpense(expenseOwnerId?: string): boolean {
    // OWNER e ADMIN podem excluir qualquer despesa
    if (this.context.role === 'OWNER' || this.context.role === 'ADMIN') {
      return true
    }

    // FULL_ACCESS pode excluir qualquer despesa
    if (this.context.permission === 'FULL_ACCESS') {
      return true
    }

    // VIEW_ONLY pode excluir apenas suas próprias despesas
    if (this.context.permission === 'VIEW_ONLY' && expenseOwnerId) {
      return this.context.userId === expenseOwnerId
    }

    return false
  }

  // Verificar se pode editar o grupo
  canEditGroup(): boolean {
    return this.context.role === 'OWNER' || this.context.role === 'ADMIN'
  }

  // Verificar se pode adicionar membros
  canAddMembers(): boolean {
    return this.context.role === 'OWNER' || this.context.role === 'ADMIN'
  }

  // Verificar se pode remover membros
  canRemoveMembers(): boolean {
    return this.context.role === 'OWNER' || this.context.role === 'ADMIN'
  }

  // Verificar se pode excluir o grupo
  canDeleteGroup(): boolean {
    return this.context.role === 'OWNER'
  }

  // Verificar se tem acesso às funcionalidades pagas (baseado no plano do proprietário)
  hasAccessToPaidFeatures(): boolean {
    // Aqui você verificaria o plano do tenant proprietário do grupo
    // Por enquanto, retornamos true para implementação posterior
    return true
  }

  // Verificar se tem acesso à IA
  hasAIAccess(): boolean {
    // Verifica se o tenant proprietário do grupo tem acesso à IA
    return this.hasAccessToPaidFeatures() // Implementar lógica específica depois
  }

  // Verificar se tem acesso ao WhatsApp
  hasWhatsAppAccess(): boolean {
    // Verifica se o tenant proprietário do grupo tem acesso ao WhatsApp
    return this.hasAccessToPaidFeatures() // Implementar lógica específica depois
  }

  // Resumo das permissões para frontend
  getPermissionsSummary() {
    return {
      canViewGroup: this.canViewGroup(),
      canViewExpenses: this.canViewExpenses(),
      canCreateExpense: this.canCreateExpense(),
      canEditExpenses: this.context.permission === 'FULL_ACCESS' || ['OWNER', 'ADMIN'].includes(this.context.role),
      canDeleteExpenses: this.context.permission === 'FULL_ACCESS' || ['OWNER', 'ADMIN'].includes(this.context.role),
      canEditGroup: this.canEditGroup(),
      canAddMembers: this.canAddMembers(),
      canRemoveMembers: this.canRemoveMembers(),
      canDeleteGroup: this.canDeleteGroup(),
      hasAIAccess: this.hasAIAccess(),
      hasWhatsAppAccess: this.hasWhatsAppAccess(),
      role: this.context.role,
      permission: this.context.permission,
      isOwner: this.context.isOwner
    }
  }
}

// Função utilitária para verificar permissões rapidamente
export function checkPermission(context: UserGroupContext, action: string, resourceOwnerId?: string): boolean {
  const checker = new PermissionChecker(context)
  
  switch (action) {
    case 'view_group':
      return checker.canViewGroup()
    case 'view_expenses':
      return checker.canViewExpenses()
    case 'create_expense':
      return checker.canCreateExpense()
    case 'edit_expense':
      return checker.canEditExpense(resourceOwnerId)
    case 'delete_expense':
      return checker.canDeleteExpense(resourceOwnerId)
    case 'edit_group':
      return checker.canEditGroup()
    case 'add_members':
      return checker.canAddMembers()
    case 'remove_members':
      return checker.canRemoveMembers()
    case 'delete_group':
      return checker.canDeleteGroup()
    default:
      return false
  }
}
