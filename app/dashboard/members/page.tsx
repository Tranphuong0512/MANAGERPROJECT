'use client'

import { useState } from 'react'
import { MembersHeader } from '@/components/members/MembersHeader'
import { MembersStats } from '@/components/members/MembersStats'
import { MembersTable } from '@/components/members/MembersTable'
import { MembersBottomWidgets } from '@/components/members/MembersBottomWidgets'
import { MemberSlideOver } from '@/components/members/MemberSlideOver'
import { CreateMemberDialog } from '@/components/members/create-member-dialog'

export default function MembersPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedMember, setSelectedMember] = useState<any | null>(null)
  
  // Fake stats for dummy data layout
  const stats = {
    totalMembers: 248,
    activeMembers: 228,
    probation: 12,
    onLeave: 8,
    avgPerformance: 89
  }

  return (
    <div className="pb-10 font-sans relative">
      <MembersHeader onCreateClick={() => setShowCreateDialog(true)} />
      
      <MembersStats stats={stats} />
      
      <MembersTable 
        members={[]} // Handled inside component with dummy data 
        onMemberClick={(member) => setSelectedMember(member)}
        onAssignEmailClick={() => {}}
        onDeleteClick={() => {}}
      />

      <MembersBottomWidgets />

      <MemberSlideOver member={selectedMember} onClose={() => setSelectedMember(null)} />

      <CreateMemberDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onMemberCreated={() => {}}
      />
    </div>
  )
}
