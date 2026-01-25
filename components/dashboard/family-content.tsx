"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  UserPlus,
  Crown,
  User,
  Clock,
  PencilSimple,
  Trash,
  SignOut,
  DotsThree,
  SpinnerGap,
  Warning,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FamilyMember } from "@/lib/types";
import { InviteMemberDialog } from "./family/invite-member-dialog";
import { EditGroupNameDialog } from "./family/edit-group-name-dialog";
import { DeleteGroupDialog } from "./family/delete-group-dialog";
import { LeaveGroupDialog } from "./family/leave-group-dialog";
import { MemberDetailsSheet } from "./family/member-details-sheet";
import { useFamilyGroup } from "@/hooks/use-family-group";

const MAX_FAMILY_MEMBERS = 7;

export function FamilyContent() {
  const { data, isLoading: loading, isError, error, mutate } = useFamilyGroup();
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Dialog states
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editNameDialogOpen, setEditNameDialogOpen] = useState(false);
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
  const [leaveGroupDialogOpen, setLeaveGroupDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);

  const handleCreateGroup = async () => {
    setCreatingGroup(true);
    setCreateError(null);
    try {
      const response = await fetch("/api/family/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "My Family" }),
      });

      if (response.ok) {
        await mutate();
      } else {
        const result = await response.json();
        setCreateError(result.error || "Failed to create group");
      }
    } catch (err) {
      setCreateError("Failed to create group");
      console.error(err);
    } finally {
      setCreatingGroup(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown size={14} className="text-amber-500" />;
      default:
        return <User size={14} className="text-muted-foreground" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">Primary</Badge>;
      default:
        return <Badge variant="outline">Member</Badge>;
    }
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "?";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Group Header Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Skeleton className="size-5 rounded" />
                  <Skeleton className="h-6 w-32" />
                </div>
                <Skeleton className="h-4 w-56 mt-2" />
              </div>
              <Skeleton className="size-9 rounded" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </CardContent>
        </Card>

        {/* Active Members Skeleton */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-20 mt-1" />
            </div>
            <Skeleton className="h-9 w-20 rounded" />
          </CardHeader>
          <CardContent className="p-0">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                {i > 1 && <Separator />}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Warning size={48} className="mx-auto text-destructive mb-4" />
          <p className="text-destructive">{error || "Failed to load family group"}</p>
          <Button variant="outline" onClick={() => mutate()} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Requires subscription upgrade
  if (data?.requiresUpgrade) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Family Plan Required</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Upgrade to the Family plan to create a family group and share your subscription with up to 7 members.
          </p>
          <Button asChild>
            <a href="/dashboard/settings/subscription">Upgrade to Family Plan</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No group yet - show create option
  if (!data?.group && data?.canCreate) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Create Your Family Group</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Create a family group to share your subscription benefits with up to 7 family members.
            Each member gets their own private financial dashboard.
          </p>
          <Button onClick={handleCreateGroup} disabled={creatingGroup}>
            {creatingGroup ? (
              <>
                <SpinnerGap size={16} className="animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Users size={16} className="mr-2" />
                Create Family Group
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data?.group) {
    return null;
  }

  const { group, userRole, isOwner } = data;
  const activeMembers = group.members.filter(m => m.status === "active");
  const pendingMembers = group.members.filter(m => m.status === "pending");
  // Only the primary user (owner) can invite new members
  const canInvite = isOwner && (group.member_count + group.pending_count) < MAX_FAMILY_MEMBERS;

  return (
    <div className="space-y-6">
      {/* Group Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users size={20} />
                {group.name}
              </CardTitle>
              <CardDescription className="mt-1">
                Manage your family group members
              </CardDescription>
            </div>
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <DotsThree size={20} weight="bold" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[160px]">
                  <DropdownMenuItem onClick={() => setEditNameDialogOpen(true)} className="whitespace-nowrap">
                    <PencilSimple size={16} className="mr-2 shrink-0" />
                    Edit Group Name
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive whitespace-nowrap"
                    onClick={() => setDeleteGroupDialogOpen(true)}
                  >
                    <Trash size={16} className="mr-2 shrink-0" />
                    Delete Group
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Members</span>
              <span className="font-medium">{group.member_count} / {MAX_FAMILY_MEMBERS}</span>
            </div>
            <Progress value={(group.member_count / MAX_FAMILY_MEMBERS) * 100} className="h-2" />
            {group.pending_count > 0 && (
              <p className="text-xs text-muted-foreground">
                {group.pending_count} pending invitation{group.pending_count > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Active Members</CardTitle>
            <CardDescription>{activeMembers.length} member{activeMembers.length !== 1 ? "s" : ""}</CardDescription>
          </div>
          {canInvite && (
            <Button size="sm" onClick={() => setInviteDialogOpen(true)}>
              <UserPlus size={16} className="mr-2" />
              Invite
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {activeMembers.map((member, index) => (
            <div key={member.id}>
              {index > 0 && <Separator />}
              <button
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                onClick={() => setSelectedMember(member)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      {getInitials(member.profile?.full_name || null, member.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">
                        {member.profile?.full_name || member.email}
                      </p>
                      {getRoleIcon(member.role)}
                    </div>
                    {member.profile?.full_name && (
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    )}
                  </div>
                </div>
                {getRoleBadge(member.role)}
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {pendingMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Invitations</CardTitle>
            <CardDescription>{pendingMembers.length} pending</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {pendingMembers.map((member, index) => (
              <div key={member.id}>
                {index > 0 && <Separator />}
                <button
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => setSelectedMember(member)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-muted">
                        <Clock size={16} className="text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{member.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Invited {new Date(member.invited_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Leave Group (for non-owners) */}
      {!isOwner && (
        <Card className="border-destructive/50">
          <CardContent className="p-4">
            <button
              className="w-full flex items-center justify-between hover:bg-destructive/5 transition-colors text-left rounded-lg p-2 -m-2"
              onClick={() => setLeaveGroupDialogOpen(true)}
            >
              <div className="flex items-center gap-3">
                <SignOut size={20} className="text-destructive" />
                <div>
                  <p className="font-medium text-sm text-destructive">Leave Family Group</p>
                  <p className="text-xs text-muted-foreground">
                    You will lose access to family plan benefits
                  </p>
                </div>
              </div>
            </button>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <InviteMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={mutate}
      />

      <EditGroupNameDialog
        open={editNameDialogOpen}
        onOpenChange={setEditNameDialogOpen}
        currentName={group.name}
        onSuccess={mutate}
      />

      <DeleteGroupDialog
        open={deleteGroupDialogOpen}
        onOpenChange={setDeleteGroupDialogOpen}
        groupName={group.name}
        memberCount={group.member_count}
      />

      <LeaveGroupDialog
        open={leaveGroupDialogOpen}
        onOpenChange={setLeaveGroupDialogOpen}
        groupName={group.name}
      />

      <MemberDetailsSheet
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
        isOwner={isOwner}
        currentUserRole={userRole}
        onUpdate={mutate}
      />
    </div>
  );
}
