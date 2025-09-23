import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, Ship, Users, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { loginUser, registerUser } from "@/lib/api";
import { loginSchema, registerSchema } from "@shared/schema";
import type { LoginData, RegisterData } from "@shared/schema";

export default function LoginPage() {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Login form
  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      // Store session token
      localStorage.setItem("authToken", data.session.token);
      localStorage.setItem("authExpires", data.session.expiresAt);
      localStorage.setItem("currentUser", JSON.stringify(data.user));
      
      toast({
        title: "Login Successful",
        description: `Welcome back, ${data.user.firstName}!`,
      });
      
      // Redirect to dashboard
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (user) => {
      toast({
        title: "Registration Successful",
        description: `Account created for ${user.firstName}. Please login to continue.`,
      });
      
      // Clear registration form and switch to login tab
      registerForm.reset();
      // Auto-switch to login tab
      const loginTab = document.querySelector('[data-testid="tab-login"]') as HTMLElement;
      loginTab?.click();
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const handleLogin = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  const handleRegister = (data: RegisterData) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Ship className="h-12 w-12 text-blue-400 mr-3" />
            <h1 className="text-4xl font-bold text-white">ARUS</h1>
          </div>
          <p className="text-blue-200">Marine Predictive Maintenance & Scheduling</p>
        </div>

        <Card className="shadow-2xl border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl text-center text-white">Access Control</CardTitle>
            <CardDescription className="text-center text-slate-300">
              Secure access to marine fleet management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 bg-slate-700">
                <TabsTrigger 
                  value="login" 
                  className="text-slate-300 data-[state=active]:text-white data-[state=active]:bg-slate-600"
                  data-testid="tab-login"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Login
                </TabsTrigger>
                <TabsTrigger 
                  value="register" 
                  className="text-slate-300 data-[state=active]:text-white data-[state=active]:bg-slate-600"
                  data-testid="tab-register"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Register
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200">Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="operator@vessel.com"
                              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                              data-testid="input-login-email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200">Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 pr-10"
                                data-testid="input-login-password"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-slate-400 hover:text-slate-200"
                                onClick={() => setShowPassword(!showPassword)}
                                data-testid="button-toggle-password"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={loginMutation.isPending}
                      data-testid="button-login"
                    >
                      {loginMutation.isPending ? "Signing In..." : "Sign In"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200">First Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="John"
                                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                data-testid="input-register-firstname"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-200">Last Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Doe"
                                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                data-testid="input-register-lastname"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200">Username</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="johndoe"
                              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                              data-testid="input-register-username"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200">Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="john.doe@vessel.com"
                              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                              data-testid="input-register-email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200">Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Create a strong password"
                                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 pr-10"
                                data-testid="input-register-password"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-slate-400 hover:text-slate-200"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                data-testid="button-toggle-confirm-password"
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-slate-400 mt-1">
                            Must contain at least 8 characters with uppercase, lowercase, and number
                          </p>
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      disabled={registerMutation.isPending}
                      data-testid="button-register"
                    >
                      {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-xs text-slate-400">
          <p>Secure marine fleet management system</p>
          <p>© 2024 ARUS. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}