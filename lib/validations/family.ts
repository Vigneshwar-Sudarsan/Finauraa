import { z } from "zod";

/**
 * Family plan validation schemas
 * For managing family groups and member invitations
 */

// Role and status enums
export const familyMemberRoleSchema = z.enum(["owner", "admin", "member"]);
export const familyMemberStatusSchema = z.enum(["pending", "active", "removed"]);

/**
 * Schema for creating a family group
 * POST /api/family/group
 */
export const createFamilyGroupSchema = z.object({
  name: z
    .string()
    .min(2, "Group name must be at least 2 characters")
    .max(50, "Group name cannot exceed 50 characters")
    .regex(
      /^[a-zA-Z0-9\s\-']+$/,
      "Group name can only contain letters, numbers, spaces, hyphens, and apostrophes"
    ),
});

/**
 * Schema for updating a family group
 * PATCH /api/family/group
 */
export const updateFamilyGroupSchema = z.object({
  name: z
    .string()
    .min(2, "Group name must be at least 2 characters")
    .max(50, "Group name cannot exceed 50 characters")
    .regex(
      /^[a-zA-Z0-9\s\-']+$/,
      "Group name can only contain letters, numbers, spaces, hyphens, and apostrophes"
    ),
});

/**
 * Schema for inviting a family member
 * POST /api/family/members/invite
 */
export const inviteFamilyMemberSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(255, "Email cannot exceed 255 characters")
    .transform((val) => val.toLowerCase()),
  role: familyMemberRoleSchema.exclude(["owner"]).default("member"),
});

/**
 * Schema for responding to an invitation
 * POST /api/family/invitations/[token]/respond
 */
export const respondToInvitationSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

/**
 * Schema for removing a member
 * DELETE /api/family/members/[id]
 */
export const removeMemberSchema = z.object({
  reason: z.string().max(500).optional(),
});

/**
 * Schema for transferring ownership
 * POST /api/family/group/transfer-ownership
 */
export const transferOwnershipSchema = z.object({
  new_owner_id: z.string().uuid("Invalid member ID"),
  confirm: z.literal(true, "You must confirm the ownership transfer"),
});

/**
 * Schema for updating member role
 * PATCH /api/family/members/[id]
 */
export const updateMemberRoleSchema = z.object({
  role: z.enum(["admin", "member"]), // Owner cannot be set via this endpoint
});

// Type exports for use in API routes
export type CreateFamilyGroupInput = z.infer<typeof createFamilyGroupSchema>;
export type UpdateFamilyGroupInput = z.infer<typeof updateFamilyGroupSchema>;
export type InviteFamilyMemberInput = z.infer<typeof inviteFamilyMemberSchema>;
export type RespondToInvitationInput = z.infer<typeof respondToInvitationSchema>;
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
