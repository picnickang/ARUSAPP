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
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 md:px-6 py-4">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="min-w-0">
            <h2 className="text-xl md:text-2xl font-bold text-foreground truncate">Organization Management</h2>
            <p className="text-sm md:text-base text-muted-foreground">Manage organizations and user accounts</p>
          </div>
          <div className="flex flex-col space-y-3 md:flex-row md:items-center md:space-y-0 md:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search organizations or users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full md:w-80 min-h-[44px] touch-manipulation"
                data-testid="input-search"
              />
            </div>
            <Button 
              onClick={() => openOrganizationDialog()} 
              className="min-h-[44px] touch-manipulation"
              data-testid="button-add-organization"
            >
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Add Organization</span>
              <span className="sm:hidden">Add Org</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="px-4 md:px-6 space-y-4 md:space-y-6">
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
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block">
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
                </div>
                
                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {filteredOrganizations.map((org) => (
                    <Card 
                      key={org.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedOrgId(org.id)}
                      data-testid={`card-organization-${org.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium text-base truncate">{org.name}</h3>
                              <p className="text-sm text-muted-foreground font-mono">{org.slug}</p>
                            </div>
                            <div className="flex flex-col items-end space-y-1">
                              <Badge className={getTierColor(org.subscriptionTier)} size="sm">
                                {org.subscriptionTier}
                              </Badge>
                              <Badge variant={org.isActive ? "default" : "secondary"} className="text-xs">
                                {org.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Max Users:</span>
                              <div className="font-medium">{org.maxUsers}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Max Equipment:</span>
                              <div className="font-medium">{org.maxEquipment}</div>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2 pt-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 min-h-[44px] touch-manipulation"
                              onClick={() => openOrganizationDialog(org)}
                              data-testid={`button-edit-organization-${org.id}`}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="min-h-[44px] touch-manipulation"
                              onClick={() => handleDeleteOrganization(org.id)}
                              data-testid={`button-delete-organization-${org.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Users Section */}
        {selectedOrgId && (
          <Card>
            <CardHeader>
              <div className="flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0">
                <CardTitle className="flex items-center text-lg md:text-xl">
                  <Users className="mr-2 h-5 w-5" />
                  Users ({filteredUsers.length})
                </CardTitle>
                <Button 
                  onClick={() => openUserDialog()} 
                  className="min-h-[44px] touch-manipulation"
                  data-testid="button-add-user"
                >
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
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block">
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
                  </div>
                  
                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3">
                    {filteredUsers.map((user) => (
                      <Card key={user.id} data-testid={`card-user-${user.id}`}>
                        <CardContent className="p-4">
                          <div className="flex flex-col space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-medium text-base truncate">{user.name}</h3>
                                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                              </div>
                              <Badge 
                                variant={user.isActive ? "default" : "secondary"}
                                className="text-xs flex-shrink-0 ml-2"
                              >
                                {user.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-muted-foreground">Role:</span>
                                <div className="font-medium flex items-center space-x-1">
                                  {getRoleIcon(user.role)}
                                  <span className="capitalize">{user.role}</span>
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Last Login:</span>
                                <div className="font-medium">
                                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex space-x-2 pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 min-h-[44px] touch-manipulation"
                                onClick={() => openUserDialog(user)}
                                data-testid={`button-edit-user-${user.id}`}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="min-h-[44px] touch-manipulation"
                                onClick={() => handleDeleteUser(user.id)}
                                data-testid={`button-delete-user-${user.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Organization Dialog */}
      <Dialog open={organizationDialogOpen} onOpenChange={setOrganizationDialogOpen}>
        <DialogContent className="max-w-2xl mx-4 md:mx-0" data-testid="dialog-organization">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={organizationForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Acme Corp" 
                          className="min-h-[44px] touch-manipulation"
                          {...field} 
                          data-testid="input-org-name" 
                        />
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
                        <Input 
                          placeholder="acme-corp" 
                          className="min-h-[44px] touch-manipulation"
                          {...field} 
                          data-testid="input-org-slug" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={organizationForm.control}
                  name="subscriptionTier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subscription Tier</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger 
                            className="min-h-[44px] touch-manipulation"
                            data-testid="select-org-tier"
                          >
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
                        <Input 
                          type="email" 
                          placeholder="billing@acme.com" 
                          className="min-h-[44px] touch-manipulation"
                          {...field} 
                          data-testid="input-org-billing" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          className="min-h-[44px] touch-manipulation"
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
                          className="min-h-[44px] touch-manipulation"
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

              <div className="flex flex-col md:flex-row md:justify-end space-y-2 md:space-y-0 md:space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[44px] touch-manipulation"
                  onClick={() => setOrganizationDialogOpen(false)}
                  data-testid="button-cancel-organization"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="min-h-[44px] touch-manipulation"
                  data-testid="button-submit-organization"
                >
                  {editingOrganization ? "Update Organization" : "Create Organization"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-2xl mx-4 md:mx-0" data-testid="dialog-user">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={userForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="John Doe" 
                          className="min-h-[44px] touch-manipulation"
                          {...field} 
                          data-testid="input-user-name" 
                        />
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
                        <Input 
                          type="email" 
                          placeholder="john@acme.com" 
                          className="min-h-[44px] touch-manipulation"
                          {...field} 
                          data-testid="input-user-email" 
                        />
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
                        <SelectTrigger 
                          className="min-h-[44px] touch-manipulation"
                          data-testid="select-user-role"
                        >
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

              <div className="flex flex-col md:flex-row md:justify-end space-y-2 md:space-y-0 md:space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[44px] touch-manipulation"
                  onClick={() => setUserDialogOpen(false)}
                  data-testid="button-cancel-user"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="min-h-[44px] touch-manipulation"
                  data-testid="button-submit-user"
                >
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