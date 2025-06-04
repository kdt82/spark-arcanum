import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; 
import { AlertCircle, CheckCircle2, Database, RefreshCw, Download, Book, BookOpen, Upload, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet";
import AdminLogin from "@/components/admin-login";

type RarityRepairResult = {
  processed: number;
  updated: number;
  errors: number;
};

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RarityRepairResult | null>(null);
  const [missingRarityCount, setMissingRarityCount] = useState<number | null>(null);
  const [dataDownloaded, setDataDownloaded] = useState(false);
  const [isImportingRules, setIsImportingRules] = useState(false);
  const [rulesImported, setRulesImported] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [isUpdatingCardDB, setIsUpdatingCardDB] = useState(false);
  const [cardDBUpdateSuccess, setCardDBUpdateSuccess] = useState(false);
  const [cardDBError, setCardDBError] = useState<string | null>(null);
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Check if user is already authenticated
  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuthenticated');
    if (adminAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (authenticated: boolean) => {
    setIsAuthenticated(authenticated);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAuthenticated');
    setIsAuthenticated(false);
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out",
    });
  };

  const checkRarityIssues = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/repair-rarities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      
      const data = await response.json();
      setMissingRarityCount(data.missingRarityCount);
      toast({
        title: "Rarity Check Complete",
        description: `Found ${data.missingRarityCount} cards with missing rarity data`,
      });
    } catch (err) {
      console.error("Error checking rarity issues:", err);
      setError("Failed to check rarity issues. See console for details.");
      toast({
        title: "Error",
        description: "Failed to check rarity issues",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadAllPrintingsData = async () => {
    if (!confirm("This will download the AllPrintings.json data from MTGJSON.com. This file is large and may take some time to download. Continue?")) {
      return;
    }
    
    setIsDownloading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/repair-rarities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ downloadData: true }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setDataDownloaded(true);
        toast({
          title: "Download Complete",
          description: "Successfully downloaded AllPrintings.json data",
        });
      } else {
        setError(data.error || "Failed to download data");
        toast({
          title: "Download Failed",
          description: data.error || "Failed to download data",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error downloading data:", err);
      setError("Failed to download data. See console for details.");
      toast({
        title: "Error",
        description: "Failed to download data",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const repairAllRarities = async () => {
    if (!confirm("This will update rarities for all cards in the database. It may take some time. Continue?")) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch("/api/repair-rarities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchProcess: true, batchSize: 500 }),
      });
      
      const data = await response.json();
      setResult(data.result);
      toast({
        title: "Rarity Repair Complete",
        description: `Updated ${data.result.updated} out of ${data.result.processed} cards`,
      });
    } catch (err) {
      console.error("Error repairing rarities:", err);
      setError("Failed to repair rarities. See console for details.");
      toast({
        title: "Error",
        description: "Failed to repair rarities",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const importComprehensiveRules = async () => {
    if (!confirm("This will download and import the official Magic: The Gathering comprehensive rules. The existing rules in the database will be replaced. This process may take several minutes. Continue?")) {
      return;
    }
    
    setIsImportingRules(true);
    setRulesImported(false);
    setRulesError(null);
    
    try {
      const response = await fetch("/api/admin/import-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setRulesImported(true);
        toast({
          title: "Rules Import Complete",
          description: "Successfully imported the comprehensive MTG rules",
        });
      } else {
        setRulesError(data.error || "Failed to import rules");
        toast({
          title: "Rules Import Failed",
          description: data.error || "Failed to import rules",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error importing rules:", err);
      setRulesError("Failed to import rules. See console for details.");
      toast({
        title: "Error",
        description: "Failed to import rules",
        variant: "destructive",
      });
    } finally {
      setIsImportingRules(false);
    }
  };
  
  const updateCardDatabase = async () => {
    if (!confirm("This will download the AllPrintings.json file from MTGJSON.com and update the card database. This file is large and the process may take some time. Continue?")) {
      return;
    }
    
    setIsUpdatingCardDB(true);
    setCardDBUpdateSuccess(false);
    setCardDBError(null);
    
    try {
      const response = await fetch("/api/cards/download-all-printings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceDownload: true }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCardDBUpdateSuccess(true);
        toast({
          title: "Card Database Update Started",
          description: "AllPrintings.json has been downloaded and database update has started in the background.",
        });
      } else {
        setCardDBError(data.message || "Failed to update card database");
        toast({
          title: "Card Database Update Failed",
          description: data.message || "Failed to update card database",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Error updating card database:", err);
      setCardDBError("Failed to update card database. See console for details.");
      toast({
        title: "Error",
        description: "Failed to update card database",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingCardDB(false);
    }
  };

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Admin Panel - Spark Arcanum</title>
      </Helmet>
      
      {!isAuthenticated ? (
        // Show login screen if not authenticated
        <AdminLogin onLogin={handleLogin} />
      ) : (
        // Show admin dashboard if authenticated
        <main className="flex-1 container mx-auto py-8 px-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold font-heading bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
              Database Administration
            </h1>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="mr-2 h-5 w-5" />
                  Update Card Database
                </CardTitle>
                <CardDescription>
                  Update the card database from MTGJSON.com using AllPrintings.json
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cardDBUpdateSuccess && (
                  <Alert className="mb-4 bg-green-50 dark:bg-green-950">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Database Update Started</AlertTitle>
                    <AlertDescription>
                      AllPrintings.json has been downloaded and the card database update is processing in the background.
                      This may take several minutes to complete.
                    </AlertDescription>
                  </Alert>
                )}
                
                {cardDBError && (
                  <Alert className="mb-4 bg-red-50 dark:bg-red-950">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{cardDBError}</AlertDescription>
                  </Alert>
                )}
                
                <p className="text-sm text-muted-foreground mb-4">
                  This will download the complete AllPrintings.json file from MTGJSON.com
                  and use it to update the card database with the latest card information.
                </p>
                
                <p className="text-sm text-muted-foreground mb-4">
                  AllPrintings.json contains detailed information about all printed Magic cards,
                  including card properties, sets, rarities, and format legalities.
                </p>
                
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> This file is quite large and the update process runs in the background.
                  It may take several minutes to complete.
                </p>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button
                  onClick={updateCardDatabase}
                  disabled={isUpdatingCardDB}
                >
                  {isUpdatingCardDB ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                  Update Card Database
                </Button>
              </CardFooter>
            </Card>
          
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="mr-2 h-5 w-5" />
                  Card Rarity Repair
                </CardTitle>
                <CardDescription>
                  Fix missing rarity information for cards in the database using the MTGJSON data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dataDownloaded && (
                  <Alert className="mb-4 bg-green-50 dark:bg-green-950">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Data Downloaded</AlertTitle>
                    <AlertDescription>
                      AllPrintings.json has been successfully downloaded. You can now proceed with repairing card rarities.
                    </AlertDescription>
                  </Alert>
                )}
                
                {missingRarityCount !== null && (
                  <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Missing Rarity Data</AlertTitle>
                    <AlertDescription>
                      {missingRarityCount} cards currently have missing rarity information.
                    </AlertDescription>
                  </Alert>
                )}
                
                {result && (
                  <Alert className={result.errors > 0 ? "mb-4 bg-yellow-50 dark:bg-yellow-950" : "mb-4 bg-green-50 dark:bg-green-950"}>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Repair Results</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside">
                        <li>Processed: {result.processed} cards</li>
                        <li>Updated: {result.updated} cards</li>
                        <li>Errors: {result.errors} cards</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                
                {error && (
                  <Alert className="mb-4 bg-red-50 dark:bg-red-950">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2 justify-between">
                <Button
                  variant="outline"
                  onClick={checkRarityIssues}
                  disabled={isLoading || isDownloading}
                >
                  {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <AlertCircle className="mr-2 h-4 w-4" />}
                  Check Issues
                </Button>
                
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={downloadAllPrintingsData}
                    disabled={isLoading || isDownloading || dataDownloaded}
                  >
                    {isDownloading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Download Card Data
                  </Button>
                  
                  <Button 
                    onClick={repairAllRarities}
                    disabled={isLoading || isDownloading}
                  >
                    {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                    Repair All Rarities
                  </Button>
                </div>
              </CardFooter>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="mr-2 h-5 w-5" />
                  MTG Rules Management
                </CardTitle>
                <CardDescription>
                  Import the comprehensive MTG rules for the Rules FAQ system.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {rulesImported && (
                  <Alert className="mb-4 bg-green-50 dark:bg-green-950">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Rules Imported</AlertTitle>
                    <AlertDescription>
                      The comprehensive MTG rules have been successfully imported into the database.
                    </AlertDescription>
                  </Alert>
                )}
                
                {rulesError && (
                  <Alert className="mb-4 bg-red-50 dark:bg-red-950">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{rulesError}</AlertDescription>
                  </Alert>
                )}
                
                <p className="text-sm text-muted-foreground mb-4">
                  This will download the official Magic: The Gathering comprehensive rules from Wizards of the Coast
                  and import them into the database. The existing rules will be replaced.
                </p>
                
                <p className="text-sm text-muted-foreground mb-4">
                  The comprehensive rules contain hundreds of detailed rules covering all aspects of the game,
                  including game mechanics, card types, zones, turn structure, and specific card interactions.
                </p>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button
                  onClick={importComprehensiveRules}
                  disabled={isImportingRules}
                >
                  {isImportingRules ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Book className="mr-2 h-4 w-4" />}
                  Import Comprehensive Rules
                </Button>
              </CardFooter>
            </Card>
          </div>
        </main>
      )}
    </>
  );
}