"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
import { FamilyGroupWithMembers, FamilyMember } from "@/lib/types";
import { InviteMemberDialog } from "./family/invite-member-dialog";
import { EditGroupNameDialog } from "./family/edit-group-name-dialog";
import { DeleteGroupDialog } from "./family/delete-group-dialog";
import { LeaveGroupDialog } from "./family/leave-group-dialog";
import { MemberDetailsSheet } from "./family/member-details-sheet";

const MAX_FAMILY_MEMBERS = 7;

interface FamilyGroupData {
  group: FamilyGroupWithMembers | null;
  userRole: "owner" | "admin" | "member" | null;
  isOwner: boolean;
  canCreate?: boolean;
  requiresUpgrade?: boolean;
}

export function FamilyContent() {
  const [data, setData] = useState<FamilyGroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Dialog states
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editNameDialogOpen, setEditNameDialogOpen] = useState(false);
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
  const [leaveGroupDialogOpen, setLeaveGroupDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);

  const fetchFamilyGroup = useCallback(async () => {
    try {
      const response = await fetch("/api/family/group");
      const result = await response.json();

      if (!response.ok) {
        if (result.requiresUpgrade) {
          setData({ group: null, userRole: null, isOwner: false, requiresUpgrade: true });
        } else {
          setError(result.error || "Failed to fetch family group");
        }
        return;
      }

      setData({
        group: result.group,
        userRole: result.userRole || null,
        isOwner: result.isOwner || false,
        canCreate: result.canCreate || false,
      });
    } catch (err) {
      setError("Failed to fetch family group");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFamilyGroup();
  }, [fetchFamilyGroup]);

  const handleCreateGroup = async () => {
    setCreatingGroup(true);
    try {
      const response = await fetch("/api/family/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "My Family" }),
      });

      if (response.ok) {
        await fetchFamilyGroup();
      } else {
        const result = await response.json();
        setError(result.error || "Failed to create group");
      }
    } catch (err) {
      setError("Failed to create group");
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
      <div className="flex items-center justify-center py-12">
        <SpinnerGap size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Warning size={48} className="mx-auto text-destructive mb-4" />
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={fetchFamilyGroup} className="mt-4">
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
        onSuccess={fetchFamilyGroup}
      />

      <EditGroupNameDialog
        open={editNameDialogOpen}
        onOpenChange={setEditNameDialogOpen}
        currentName={group.name}
        onSuccess={fetchFamilyGroup}
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
        onUpdate={fetchFamilyGroup}
      />
    </div>
  );
}
