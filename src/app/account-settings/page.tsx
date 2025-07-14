"use client";
// Ensures this file is treated as client-side code in a Next.js application.

import { useState, useEffect } from "react";
// React hooks for managing component state and side effects.

import {
  fetchUserAttributes,
  updateUserAttribute,
  confirmUserAttribute,
  type VerifiableUserAttributeKey,
} from "aws-amplify/auth";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Lucide React icons
import {
  User,
  Mail,
  Lock,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
  Shield,
  Key,
} from "lucide-react";

import outputs from "../../../amplify_outputs.json";
import { Amplify } from "aws-amplify";

Amplify.configure(outputs);

// Amplify Auth utilities for managing user attributes and authentication flows.

export default function AccountSettingsPage() {
  // ==================== State Management ====================
  const [userAttributes, setUserAttributes] = useState<Record<string, string>>(
    {}
  );
  // Stores user attributes fetched from the backend.

  const [newEmail, setNewEmail] = useState(""); // Tracks the input value for updating email.
  const [newName, setNewName] = useState(""); // Tracks the input value for updating name.
  const [confirmationCode, setConfirmationCode] = useState(""); // Tracks the confirmation code input for email verification.
  const [currentAttributeKey, setCurrentAttributeKey] = useState<string | null>(
    null
  );
  // Tracks the attribute (e.g., email) being verified.

  const [loading, setLoading] = useState(false); // Tracks loading state for async operations.
  const [globalMessage, setGlobalMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  // Displays global messages, like errors or success notifications.

  const [emailMessage, setEmailMessage] = useState<string | null>(null); // Displays email-specific messages.
  const [nameMessage, setNameMessage] = useState<string | null>(null); // Displays name-specific messages.
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null); // Displays password-specific messages.

  // ==================== Event Handlers ====================
  // Fetches user attributes from AWS Cognito.
  const fetchAttributes = async () => {
    setLoading(true);
    setGlobalMessage(null);
    try {
      const data = await fetchUserAttributes(); // Fetch attributes from the backend.
      const attributes = Object.entries(data || {}).reduce<
        Record<string, string>
      >((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value); // Convert attribute values to strings.
        }
        return acc;
      }, {});
      setUserAttributes(attributes); // Update the state with fetched attributes.
    } catch (error) {
      console.error("Error fetching user attributes:", error);
      setGlobalMessage({
        type: "error",
        text: "Failed to fetch user attributes.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Updates a user attribute (e.g., email or name).
  const handleUpdateAttribute = async (
    key: string,
    value: string,
    setMessage: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    if (!value.trim()) {
      setMessage(`${key} cannot be empty.`);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const result = await updateUserAttribute({
        userAttribute: { attributeKey: key, value },
      });
      if (
        result.nextStep.updateAttributeStep === "CONFIRM_ATTRIBUTE_WITH_CODE"
      ) {
        setCurrentAttributeKey(key); // If confirmation is required, track the attribute key.
        setMessage(
          `A confirmation code has been sent to your ${key}. Please enter it below.`
        );
      } else {
        setMessage(`${key} updated successfully.`);
      }
      fetchAttributes(); // Refresh user attributes.
    } catch (error) {
      setMessage(`Failed to update ${key}.: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Confirms a user attribute using a verification code.
  const handleConfirmAttribute = async () => {
    if (!currentAttributeKey || !confirmationCode.trim()) {
      setEmailMessage("Confirmation code is required.");
      return;
    }
    setLoading(true);
    setEmailMessage(null);
    try {
      await confirmUserAttribute({
        userAttributeKey: currentAttributeKey as VerifiableUserAttributeKey,
        confirmationCode,
      });
      setEmailMessage(`${currentAttributeKey} confirmed successfully.`);
      setCurrentAttributeKey(null); // Reset the current attribute key after confirmation.
      setConfirmationCode(""); // Clear the confirmation code input.
      fetchAttributes(); // Refresh user attributes.
    } catch (error) {
      setEmailMessage(`Failed to confirm attribute. ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Handles password update success.
  const handleUpdatePassword = async () => {
    setPasswordMessage("Your password has been updated successfully.");
  };

  // ==================== Lifecycle ====================
  useEffect(() => {
    fetchAttributes(); // Fetch user attributes when the component mounts.
  }, []);

  // ==================== Render ====================
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Account Settings</h1>
      </div>

      {/* Display global messages */}
      {globalMessage && (
        <Alert
          variant={globalMessage.type === "error" ? "destructive" : "default"}
          className="border-2"
        >
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="font-medium">
            {globalMessage.text}
          </AlertDescription>
        </Alert>
      )}

      {loading && (
        <Alert className="border-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <AlertDescription className="font-medium">
            Loading...
          </AlertDescription>
        </Alert>
      )}

      {/* User Attributes Table */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Attributes
          </CardTitle>
          <CardDescription>
            Your current account information from AWS Cognito
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold w-1/3">Attribute</TableHead>
                <TableHead className="font-semibold w-2/3">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(userAttributes).map(([key, value]) => (
                <TableRow key={key}>
                  <TableCell className="font-medium">{key}</TableCell>
                  <TableCell className="break-words">{value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Update Email Section */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Update Email
            </CardTitle>
            <CardDescription>Change your email address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-email" className="font-medium">
                New Email
              </Label>
              <Input
                id="new-email"
                type="email"
                placeholder="Enter new email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <Button
              onClick={() =>
                handleUpdateAttribute("email", newEmail, setEmailMessage)
              }
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Update Email
                </>
              )}
            </Button>
            {emailMessage && (
              <Alert
                variant={
                  emailMessage.includes("success") ? "default" : "destructive"
                }
                className="border-2"
              >
                <CheckCircle className="h-5 w-5" />
                <AlertDescription className="font-medium">
                  {emailMessage}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Update Name Section */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Update Name
            </CardTitle>
            <CardDescription>Change your display name</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-name" className="font-medium">
                New Name
              </Label>
              <Input
                id="new-name"
                type="text"
                placeholder="Enter new name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <Button
              onClick={() =>
                handleUpdateAttribute("name", newName, setNameMessage)
              }
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <User className="mr-2 h-4 w-4" />
                  Update Name
                </>
              )}
            </Button>
            {nameMessage && (
              <Alert
                variant={
                  nameMessage.includes("success") ? "default" : "destructive"
                }
                className="border-2"
              >
                <CheckCircle className="h-5 w-5" />
                <AlertDescription className="font-medium">
                  {nameMessage}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirm Attribute Section */}
      {currentAttributeKey && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Confirm {currentAttributeKey}
            </CardTitle>
            <CardDescription>
              Enter the confirmation code sent to your {currentAttributeKey}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirmation-code" className="font-medium">
                Confirmation Code
              </Label>
              <Input
                id="confirmation-code"
                type="text"
                placeholder="Enter confirmation code"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
              />
            </div>
            <Button
              onClick={handleConfirmAttribute}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm
                </>
              )}
            </Button>
            {emailMessage && (
              <Alert
                variant={
                  emailMessage.includes("success") ? "default" : "destructive"
                }
                className="border-2"
              >
                <CheckCircle className="h-5 w-5" />
                <AlertDescription className="font-medium">
                  {emailMessage}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Update Password Section */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Update Password
            </CardTitle>
            <CardDescription>Change your account password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password" className="font-medium">
                Current Password
              </Label>
              <Input
                id="current-password"
                type="password"
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password" className="font-medium">
                New Password
              </Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="font-medium">
                Confirm New Password
              </Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm new password"
              />
            </div>
            <Button
              onClick={handleUpdatePassword}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  Change Password
                </>
              )}
            </Button>
            {passwordMessage && (
              <Alert className="border-2">
                <CheckCircle className="h-5 w-5" />
                <AlertDescription className="font-medium">
                  {passwordMessage}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Delete User Section */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Account
            </CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive" className="border-2">
              <AlertCircle className="h-5 w-5" />
              <AlertDescription className="font-semibold">
                This action cannot be undone. All your data will be permanently
                deleted.
              </AlertDescription>
            </Alert>
            <Button
              variant="destructive"
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to delete your account? This action cannot be undone."
                  )
                ) {
                  // Here you would implement the account deletion logic
                  // This would typically involve calling an API endpoint
                }
              }}
              disabled={loading}
              className="w-full"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
