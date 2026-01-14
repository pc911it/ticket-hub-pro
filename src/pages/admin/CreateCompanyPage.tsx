import { useState } from "react";
import { CreateCompanyDialog } from "@/components/CreateCompanyDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Plus, Gift, UserPlus, Shield } from "lucide-react";

export default function CreateCompanyPage() {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Company</h1>
        <p className="text-muted-foreground">
          Manually onboard companies with custom settings and discounts
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card 
          className="cursor-pointer hover:border-primary transition-colors group"
          onClick={() => setShowDialog(true)}
        >
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>New Company</CardTitle>
            <CardDescription>
              Create a new company account with owner credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              <Building2 className="h-4 w-4 mr-2" />
              Create Company
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-2">
              <Gift className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>With Discount</CardTitle>
            <CardDescription>
              Apply percentage or fixed discounts for special deals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Percentage discounts (e.g., 20% off)</li>
              <li>• Fixed amount off (e.g., $50/mo off)</li>
              <li>• Tracked in company config</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2">
              <UserPlus className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Extended Trial</CardTitle>
            <CardDescription>
              Offer extended trial periods for qualified leads
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 14 days (Standard)</li>
              <li>• 30, 60, or 90 days</li>
              <li>• Auto-approve option</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-2 font-bold">
                1
              </div>
              <p className="font-medium">Enter Details</p>
              <p className="text-sm text-muted-foreground">Company & owner info</p>
            </div>
            <div className="text-center p-4">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-2 font-bold">
                2
              </div>
              <p className="font-medium">Set Pricing</p>
              <p className="text-sm text-muted-foreground">Plan & discounts</p>
            </div>
            <div className="text-center p-4">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-2 font-bold">
                3
              </div>
              <p className="font-medium">Create Account</p>
              <p className="text-sm text-muted-foreground">Owner gets access</p>
            </div>
            <div className="text-center p-4">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-2 font-bold">
                4
              </div>
              <p className="font-medium">Ready to Go</p>
              <p className="text-sm text-muted-foreground">Company is live</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <CreateCompanyDialog 
        open={showDialog} 
        onOpenChange={setShowDialog}
      />
    </div>
  );
}
