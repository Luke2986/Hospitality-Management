import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { User } from "@shared/schema";

export default function Settings() {
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/me"],
  });

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your profile details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Full Name</div>
            <div className="text-base">{user?.fullName || "Not set"}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Email</div>
            <div className="text-base">{user?.email}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Member Since</div>
            <div className="text-base">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
