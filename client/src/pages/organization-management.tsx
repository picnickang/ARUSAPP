import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search, Building, Users, Edit, Trash2, Crown, ShieldCheck, Wrench, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertOrganizationSchema, insertUserSchema } from "@shared/schema";
import type { Organization, User, InsertOrganization, InsertUser } from "@shared/schema";
import { z } from "zod";

export default function OrganizationManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [organizationDialogOpen, setOrganizationDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();

  // Fetch organizations
  const { data: organizations = [], isLoading: organizationsLoading, refetch: refetchOrganizations } = useQuery({
    queryKey: ["/api/organizations"],
    refetchInterval: 30000,
  });

  // Fetch users for selected organization
  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ["/api/users", selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      const params = new URLSearchParams({ orgId: selectedOrgId });
      const response = await fetch(`/api/users?${params}`);
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
    enabled: !!selectedOrgId,
    refetchInterval: 30000,
  });

  // Organization form
  const organizationForm = useForm<InsertOrganization>({
    resolver: zodResolver(insertOrganizationSchema),
    defaultValues: {
      name: "",
      slug: "",
      subscriptionTier: "basic",
      isActive: true,
      maxUsers: 50,
      maxEquipment: 1000,
    },
  });

  // User form
  const userForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "viewer",
      isActive: true,
      orgId: selectedOrgId,
    },
  });

  // Filter organizations
  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter users
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateOrganization = async (data: InsertOrganization) => {
    try {
      await apiRequest("POST", "/api/organizations", data);
      toast({
        title: "Success",
        description: "Organization created successfully",
      });
      setOrganizationDialogOpen(false);
      organizationForm.reset();
      refetchOrganizations();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create organization",
        variant: "destructive",
      });
    }
  };

  const handleUpdateOrganization = async (data: InsertOrganization) => {
    if (!editingOrganization) return;
    try {
      await apiRequest("PUT", `/api/organizations/${editingOrganization.id}`, data);
      toast({
        title: "Success",
        description: "Organization updated successfully",
      });
      setOrganizationDialogOpen(false);
      setEditingOrganization(null);
      organizationForm.reset();
      refetchOrganizations();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update organization",
        variant: "destructive",
      });
    }
  };

  const handleDeleteOrganization = async (id: string) => {
    if (!confirm("Are you sure you want to delete this organization? This action cannot be undone.")) return;
    try {
      await apiRequest("DELETE", `/api/organizations/${id}`);
      toast({
        title: "Success",
        description: "Organization deleted successfully",
      });
      refetchOrganizations();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete organization",
        variant: "destructive",
      });
    }
  };

  const handleCreateUser = async (data: InsertUser) => {
    try {
      await apiRequest("POST", "/api/users", { ...data, orgId: selectedOrgId });
      toast({
        title: "Success",
        description: "User created successfully",
      });
      setUserDialogOpen(false);
      userForm.reset();
      refetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      });
    }
  };

  const handleUpdateUser = async (data: InsertUser) => {
    if (!editingUser) return;
    try {
      await apiRequest("PUT", `/api/users/${editingUser.id}`, data);
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setUserDialogOpen(false);
      setEditingUser(null);
      userForm.reset();
      refetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    try {
      await apiRequest("DELETE", `/api/users/${id}`);
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      refetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const openOrganizationDialog = (organization?: Organization) => {
    if (organization) {
      setEditingOrganization(organization);
      organizationForm.reset(organization);
    } else {
      setEditingOrganization(null);
      organizationForm.reset({
        name: "",
        slug: "",
        subscriptionTier: "basic",
        isActive: true,
        maxUsers: 50,
        maxEquipment: 1000,
      });
    }
    setOrganizationDialogOpen(true);
  };

  const openUserDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      userForm.reset(user);
    } else {
      setEditingUser(null);
      userForm.reset({
        name: "",
        email: "",
        role: "viewer",
        isActive: true,
        orgId: selectedOrgId,
      });
    }
    setUserDialogOpen(true);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin": return <Crown className="h-4 w-4" />;
      case "manager": return <ShieldCheck className="h-4 w-4" />;
      case "technician": return <Wrench className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "enterprise": return "bg-purple-100 text-purple-800";
      case "pro": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Organization Management</h2>
            <p className="text-muted-foreground">Manage organizations and user accounts</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search organizations or users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80"
                data-testid="input-search"
              />
            </div>
            <Button onClick={() => openOrganizationDialog()} data-testid="button-add-organization">
              <Plus className="mr-2 h-4 w-4" />
              Add Organization
            </Button>
          </div>
        </div>
      </header>

      <div className="px-6 space-y-6">
        {/* Organizations Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="mr-2 h-5 w-5" />
              Organizations ({filteredOrganizations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {organizationsLoading ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Loading organizations...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrganizations.map((org) => (
                    <TableRow
                      key={org.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedOrgId(org.id)}
                      data-testid={`row-organization-${org.id}`}
                    >
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell className="font-mono text-sm">{org.slug}</TableCell>
                      <TableCell>
                        <Badge className={getTierColor(org.subscriptionTier)}>
                          {org.subscriptionTier}
                        </Badge>
                      </TableCell>
                      <TableCell>{org.maxUsers}</TableCell>
                      <TableCell>{org.maxEquipment}</TableCell>
                      <TableCell>
                        <Badge variant={org.isActive ? "default" : "secondary"}>
                          {org.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openOrganizationDialog(org);
                            }}
                            data-testid={`button-edit-organization-${org.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteOrganization(org.id);
                            }}
                            data-testid={`button-delete-organization-${org.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Users Section */}
        {selectedOrgId && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Users ({filteredUsers.length})
                </CardTitle>
                <Button onClick={() => openUserDialog()} data-testid="button-add-user">
                  <Plus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  Loading users...
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getRoleIcon(user.role)}
                            <span className="capitalize">{user.role}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openUserDialog(user)}
                              data-testid={`button-edit-user-${user.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              data-testid={`button-delete-user-${user.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Organization Dialog */}
      <Dialog open={organizationDialogOpen} onOpenChange={setOrganizationDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-organization">
          <DialogHeader>
            <DialogTitle>
              {editingOrganization ? "Edit Organization" : "Create Organization"}
            </DialogTitle>
          </DialogHeader>
          <Form {...organizationForm}>
            <form
              onSubmit={organizationForm.handleSubmit(
                editingOrganization ? handleUpdateOrganization : handleCreateOrganization
              )}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={organizationForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corp" {...field} data-testid="input-org-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={organizationForm.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input placeholder="acme-corp" {...field} data-testid="input-org-slug" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={organizationForm.control}
                  name="subscriptionTier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subscription Tier</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-org-tier">
                            <SelectValue placeholder="Select tier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={organizationForm.control}
                  name="billingEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="billing@acme.com" {...field} data-testid="input-org-billing" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={organizationForm.control}
                  name="maxUsers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Users</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="50"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-org-max-users"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={organizationForm.control}
                  name="maxEquipment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Equipment</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="1000"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-org-max-equipment"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOrganizationDialogOpen(false)}
                  data-testid="button-cancel-organization"
                >
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit-organization">
                  {editingOrganization ? "Update Organization" : "Create Organization"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-user">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit User" : "Create User"}
            </DialogTitle>
          </DialogHeader>
          <Form {...userForm}>
            <form
              onSubmit={userForm.handleSubmit(
                editingUser ? handleUpdateUser : handleCreateUser
              )}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={userForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} data-testid="input-user-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={userForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@acme.com" {...field} data-testid="input-user-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={userForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-user-role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="technician">Technician</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUserDialogOpen(false)}
                  data-testid="button-cancel-user"
                >
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit-user">
                  {editingUser ? "Update User" : "Create User"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}