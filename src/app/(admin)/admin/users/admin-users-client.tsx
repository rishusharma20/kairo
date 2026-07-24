"use client";

import { motion } from "framer-motion";
import { Search, Command, ArrowDown, Users, ShieldAlert } from "lucide-react";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { toggleUserSuspension } from "@/app/actions/admin";

export type UserType = {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: "Active" | "Suspended";
  requests: number;
};

export function AdminUsersClient({ users }: { users: UserType[] }) {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(search.toLowerCase()) || user.name.toLowerCase().includes(search.toLowerCase())
  );

  const fadeUp = {
    initial: { opacity: 0, y: 20, filter: "blur(10px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } },
  };

  return (
    <div className="w-full flex flex-col items-center justify-center py-12">
      
      {/* Header */}
      <motion.section 
        variants={fadeUp} 
        initial="initial" 
        animate="animate" 
        className="flex flex-col items-center mb-16 text-center"
      >
        <h1 className="text-4xl md:text-5xl font-extralight text-text-primary mb-2">
          User Database.
        </h1>
        <p className="text-text-muted text-sm tracking-[0.2em] uppercase">
          Global Registry.
        </p>
      </motion.section>

      {/* Search Input (Raycast Style) */}
      <motion.section 
        variants={fadeUp} 
        initial="initial" 
        animate="animate" 
        className="w-full max-w-2xl flex flex-col items-center mb-24"
      >
        <div className="relative w-full group">
          <div className="absolute inset-0 bg-destructive/5 blur-xl group-hover:bg-destructive/10 transition-colors duration-500 rounded-full" />
          <div className="relative flex items-center bg-transparent border-b border-[var(--border)] focus-within:border-destructive/50 transition-colors pb-4 px-2">
            <Search className="w-5 h-5 text-text-muted group-focus-within:text-destructive transition-colors mr-4" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email or name..."
              className="w-full bg-transparent border-none outline-none text-2xl font-light text-text-primary placeholder:text-text-muted/30 focus:ring-0 p-0"
            />
            <div className="flex items-center gap-1 text-[10px] text-text-muted uppercase tracking-widest bg-destructive/10 px-2 py-1 rounded">
              <Command className="w-3 h-3" /> F
            </div>
          </div>
        </div>
      </motion.section>

      {/* Users Feed */}
      <motion.section 
        variants={fadeUp} 
        initial="initial" 
        animate="animate" 
        className="w-full flex flex-col items-center"
      >
        {filteredUsers.length > 0 ? (
          <div className="flex flex-col items-center space-y-12 w-full max-w-2xl">
            {filteredUsers.map((user, index) => (
              <div key={user.id} className="w-full flex flex-col items-center">
                <div 
                  className="w-full group cursor-pointer flex flex-col items-center text-center"
                  onClick={() => setSelectedUser(selectedUser === user.id ? null : user.id)}
                >
                  <h3 className="text-2xl md:text-3xl font-light text-text-primary group-hover:text-destructive transition-colors">
                    {user.name}
                  </h3>
                  <span className="text-xs text-text-muted uppercase tracking-[0.2em] mt-2 block">
                    {user.email}
                  </span>
                  
                  {/* Expanded Admin Actions (Inline instead of cards) */}
                  <motion.div
                    initial={false}
                    animate={{ height: selectedUser === user.id ? "auto" : 0, opacity: selectedUser === user.id ? 1 : 0 }}
                    className="overflow-hidden w-full"
                  >
                    <div className="pt-12 pb-4 flex flex-col items-center space-y-12">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-2">Total Usage</span>
                        <span className="text-4xl font-light text-text-primary">{user.requests} req</span>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-2">Tier Level</span>
                        <span className={cn("text-3xl font-light", user.plan === "PRO" ? "text-accent" : "text-text-primary")}>
                          {user.plan}
                        </span>
                        <span className="text-[10px] text-text-muted uppercase tracking-[0.2em] mt-4 hover:text-text-primary transition-colors cursor-pointer">
                          Modify Plan
                        </span>
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="text-sm font-light text-text-muted uppercase tracking-[0.3em] mb-2">Account State</span>
                        <span className={cn("text-3xl font-light", user.status === "Suspended" ? "text-destructive" : "text-success")}>
                          {user.status}.
                        </span>
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            startTransition(() => toggleUserSuspension(user.id, user.status === "Suspended"));
                          }}
                          className={cn(
                            "text-[10px] uppercase tracking-[0.2em] mt-4 hover:opacity-70 transition-colors cursor-pointer",
                            user.status === "Active" ? "text-destructive" : "text-success",
                            isPending && "opacity-50 pointer-events-none"
                          )}
                        >
                          {user.status === "Active" ? "Suspend Account" : "Revoke Suspension"}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {index !== filteredUsers.length - 1 && (
                  <div className="flex justify-center text-text-muted/10 mt-12">
                    <ArrowDown className="w-3 h-3" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-full border border-destructive/20 bg-destructive/5 flex items-center justify-center mb-6">
              <Users className="w-6 h-6 text-destructive/50" />
            </div>
            <h3 className="text-2xl font-light text-text-primary mb-2">No users found.</h3>
            <p className="text-sm text-text-muted tracking-[0.1em]">Database query returned empty.</p>
          </motion.div>
        )}
      </motion.section>
      
      <div className="h-32" />
    </div>
  );
}
