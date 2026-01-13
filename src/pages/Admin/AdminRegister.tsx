// src/pages/AdminRegister.tsx
import React, { useState } from "react";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { useAuth } from "../../contexts/AuthContext";

const AdminRegister: React.FC = () => {
    const { inviteAdmin } = useAuth();
    const [form, setForm] = useState({ username: "", email: "" });
    const [loading, setLoading] = useState(false);

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [e.target.name]: e.target.value });

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await inviteAdmin(form);
            setForm({ username: "", email: "" });
        } catch (err) {
            // handled by hook
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <div className="max-w-md bg-slate-900/60 p-6 rounded-lg border border-slate-700">
                <h3 className="text-xl font-bold mb-4 text-indigo-300">Invite New Admin</h3>
                <form onSubmit={submit} className="space-y-4">
                    <Input label="Username" name="username" value={form.username} onChange={onChange} required />
                    <Input label="Email" name="email" type="email" value={form.email} onChange={onChange} required />
                    <Button type="submit" disabled={loading}>{loading ? "Sending..." : "Send Invite"}</Button>
                </form>
            </div>
        </div>
    );
};

export default AdminRegister;
