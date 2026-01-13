import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Coins, Gift, Flame, ExternalLink, DollarSign, Rocket, Target } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";

export default function Credits() {
  const [promoCode, setPromoCode] = useState("");
  const [txSignature, setTxSignature] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [taxRate, setTaxRate] = useState("600"); // 6% default
  const [showWelcome, setShowWelcome] = useState(false);
  const [location] = useLocation();
  
  // Check if user is coming from onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('welcome') === 'true') {
      setShowWelcome(true);
      // Clean up URL
      window.history.replaceState({}, '', '/credits');
    }
  }, [location]);

  const { data: credits, isLoading: creditsLoading, refetch: refetchCredits } = trpc.credits.balance.useQuery();
  const { data: transactions, isLoading: txLoading } = trpc.credits.transactions.useQuery();
  const { data: burnHistory } = trpc.credits.burnHistory.useQuery();

  const applyPromoMutation = trpc.credits.applyPromo.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Promo code applied! +$${(data.creditAmount! / 100).toFixed(2)} credits`);
        setPromoCode("");
        refetchCredits();
      } else {
        toast.error(data.error || "Failed to apply promo code");
      }
    },
    onError: () => {
      toast.error("Failed to apply promo code");
    },
  });

  const burnTokenMutation = trpc.credits.burnToken.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Token burn verified! +$${(data.creditsGranted! / 100).toFixed(2)} credits`);
        setTxSignature("");
        refetchCredits();
      } else {
        toast.error(data.error || "Failed to verify burn");
      }
    },
    onError: () => {
      toast.error("Failed to verify token burn");
    },
  });

  const handleApplyPromo = () => {
    if (!promoCode.trim()) {
      toast.error("Please enter a promo code");
      return;
    }
    applyPromoMutation.mutate({ code: promoCode.trim().toUpperCase() });
  };

  const handleBurnToken = () => {
    if (!txSignature.trim()) {
      toast.error("Please enter transaction signature");
      return;
    }
    if (!tokenAddress.trim()) {
      toast.error("Please enter token address");
      return;
    }
    
    burnTokenMutation.mutate({
      txSignature: txSignature.trim(),
      tokenAddress: tokenAddress.trim(),
      taxRate: parseInt(taxRate),
    });
  };

  if (creditsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const balance = credits?.balance || 0;
  const balanceUSD = (balance / 100).toFixed(2);

  return (
    <>
      {/* Welcome Modal */}
      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-6 h-6 text-purple-500" />
              <DialogTitle className="text-2xl">Welcome to apply.fun! 🎉</DialogTitle>
            </div>
            <DialogDescription className="text-base">
              You've received <strong className="text-purple-500">$5.00 in free credits</strong> to get started!
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-purple-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Your Credits</h4>
                  <p className="text-sm text-muted-foreground">
                    Each job application costs $1.00. With your free credits, you can apply to 5 jobs right away!
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Rocket className="w-5 h-5 text-purple-500" />
                Quick Start Guide
              </h4>
              
              <ol className="space-y-2 text-sm text-muted-foreground ml-7">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground">1.</span>
                  <span>Browse <strong>67+ crypto jobs</strong> from top Web3 companies</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground">2.</span>
                  <span>Add jobs to your <strong>application queue</strong> for review</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground">3.</span>
                  <span>Click <strong>"Apply to All"</strong> to auto-apply in seconds</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground">4.</span>
                  <span>Track your applications and responses in the dashboard</span>
                </li>
              </ol>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Need More Credits?</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Top up using crypto or burn your tokens for credits at market price!
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Apply promo codes for bonus credits</li>
                    <li>• Burn tokens on Sol Incinerator for instant credits</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowWelcome(false)} className="flex-1">
              I'll Explore Later
            </Button>
            <Button 
              onClick={() => {
                setShowWelcome(false);
                window.location.href = '/jobs';
              }} 
              className="flex-1"
            >
              Browse Jobs Now →
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Credits & Payments</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account balance and top up credits
        </p>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Current Balance
          </CardTitle>
          <CardDescription>1 credit = 1 job application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">${balanceUSD}</div>
          <p className="text-sm text-muted-foreground mt-2">
            {balance} credits available • ~{balance} applications
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="promo" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="promo">
            <Gift className="w-4 h-4 mr-2" />
            Promo Code
          </TabsTrigger>
          <TabsTrigger value="burn">
            <Flame className="w-4 h-4 mr-2" />
            Burn Token
          </TabsTrigger>
        </TabsList>

        <TabsContent value="promo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Apply Promo Code</CardTitle>
              <CardDescription>
                Enter a promo code to receive free credits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="promo">Promo Code</Label>
                <Input
                  id="promo"
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  disabled={applyPromoMutation.isPending}
                />
              </div>
              <Button
                onClick={handleApplyPromo}
                disabled={applyPromoMutation.isPending}
                className="w-full"
              >
                {applyPromoMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Apply Code
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="burn" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Burn Token for Credits</CardTitle>
              <CardDescription>
                Burn your CryptoApply token to receive credits at current market price
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-sm">How it works:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Burn your token on <a href="https://sol-incinerator.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-1">Sol Incinerator <ExternalLink className="w-3 h-3" /></a></li>
                  <li>Copy the transaction signature from Solscan</li>
                  <li>Paste it below with the token address</li>
                  <li>Receive credits at current market price (rounded up)</li>
                </ol>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tokenAddress">Token Address</Label>
                <Input
                  id="tokenAddress"
                  placeholder="Enter Solana token address"
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                  disabled={burnTokenMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="txSignature">Transaction Signature</Label>
                <Input
                  id="txSignature"
                  placeholder="Paste Solscan transaction signature"
                  value={txSignature}
                  onChange={(e) => setTxSignature(e.target.value)}
                  disabled={burnTokenMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={(parseInt(taxRate) / 100).toString()}
                  onChange={(e) => setTaxRate((parseFloat(e.target.value) * 100).toString())}
                  disabled={burnTokenMutation.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Token tax rate (6-10%). Credits calculated after tax.
                </p>
              </div>

              <Button
                onClick={handleBurnToken}
                disabled={burnTokenMutation.isPending}
                className="w-full"
              >
                {burnTokenMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Verify & Credit Account
              </Button>
            </CardContent>
          </Card>

          {burnHistory && burnHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Burn History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {burnHistory.map((burn) => (
                    <div key={burn.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">+${(burn.creditsGranted / 100).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(burn.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <a
                        href={`https://solscan.io/tx/${burn.txSignature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:underline inline-flex items-center gap-1"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Recent credit transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {txLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {tx.amount > 0 ? "+" : ""}${(Math.abs(tx.amount) / 100).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      Balance: ${(tx.balanceAfter / 100).toFixed(2)}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      tx.type === "signup_bonus" || tx.type === "promo_code" || tx.type === "payment"
                        ? "bg-green-500/10 text-green-500"
                        : "bg-red-500/10 text-red-500"
                    }`}>
                      {tx.type.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No transactions yet</p>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
}
