"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Customer = { id: string; display_name: string; phone: string | null; email: string | null };
type Supplier = { id: string; name: string; phone: string | null; email: string | null; active: boolean };
type Expense = { id: string; description: string; category: string; amount_minor: number; expense_date: string; reference: string | null };
type PurchaseOrder = { id: string; reference: string; supplier_id: string; status: string; created_at: string };
type PurchaseItem = { id: string; purchase_order_id: string; variant_id: string; quantity_ordered: number; quantity_received: number; unit_cost_minor: number };
type Variant = { id: string; product_id: string; title: string; sku: string | null; status: string };
type Product = { id: string; title: string };
type Location = { id: string; name: string; code: string };

export default function ErpManager({ tenantId, role, customers, suppliers, expenses, purchaseOrders, purchaseItems, variants, products, locations }: {
  tenantId: string; role: string; customers: Customer[]; suppliers: Supplier[]; expenses: Expense[];
  purchaseOrders: PurchaseOrder[]; purchaseItems: PurchaseItem[]; variants: Variant[]; products: Product[]; locations: Location[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("General");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0,10));
  const [expenseReference, setExpenseReference] = useState("");
  const [poSupplier, setPoSupplier] = useState(suppliers[0]?.id ?? "");
  const [poReference, setPoReference] = useState("");
  const [poVariant, setPoVariant] = useState(variants.find(v => v.status !== "archived")?.id ?? "");
  const [poQuantity, setPoQuantity] = useState("1");
  const [poUnitCost, setPoUnitCost] = useState("");
  const [receiveOrder, setReceiveOrder] = useState("");
  const [receiveItem, setReceiveItem] = useState("");
  const [receiveLocation, setReceiveLocation] = useState(locations[0]?.id ?? "");
  const [receiveQuantity, setReceiveQuantity] = useState("1");
  const [receiveReference, setReceiveReference] = useState("");

  const canCustomers = ["owner","manager","order_operator"].includes(role);
  const canSuppliers = ["owner","manager","stock_clerk"].includes(role);
  const canFinance = ["owner","manager","finance_viewer"].includes(role);
  const canPurchasing = canSuppliers;
  const variantLabel = (id: string) => {
    const variant = variants.find(v => v.id === id);
    return variant ? `${products.find(p => p.id === variant.product_id)?.title ?? "Product"} — ${variant.title}${variant.sku ? ` (${variant.sku})` : ""}` : "Unknown variant";
  };

  async function callRpc(name: string, args: Record<string, unknown>, success: string) {
    setBusy(true); setError(""); setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) throw new Error("Your session has expired. Sign in again.");
      const { error: rpcError } = await supabase.rpc(name as never, args as never);
      if (rpcError) throw rpcError;
      setMessage(success); router.refresh();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The operation failed.");
      return false;
    } finally { setBusy(false); }
  }

  async function addCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await callRpc("create_tenant_customer",{p_tenant_id:tenantId,p_display_name:customerName.trim(),p_email:customerEmail.trim()||null,p_phone:customerPhone.trim()||null,p_notes:""},"Customer added.")) {
      setCustomerName("");setCustomerPhone("");setCustomerEmail("");
    }
  }
  async function addSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await callRpc("create_tenant_supplier",{p_tenant_id:tenantId,p_name:supplierName.trim(),p_email:supplierEmail.trim()||null,p_phone:supplierPhone.trim()||null,p_notes:""},"Supplier added.")) {
      setSupplierName("");setSupplierPhone("");setSupplierEmail("");
    }
  }
  async function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(expenseAmount.trim()) || Number(expenseAmount)<=0) { setError("Enter a positive expense amount with up to two decimal places."); return; }
    if (await callRpc("create_tenant_expense",{p_tenant_id:tenantId,p_description:expenseDescription.trim(),p_category:expenseCategory.trim(),p_amount_minor:Math.round(Number(expenseAmount)*100),p_expense_date:expenseDate,p_reference:expenseReference.trim()||null,p_notes:""},"Expense recorded and audit logged.")) {
      setExpenseDescription("");setExpenseAmount("");setExpenseReference("");
    }
  }
  async function createPo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const quantity=Number(poQuantity), cost=Number(poUnitCost);
    if (!poSupplier || !poVariant || !poReference.trim() || !Number.isInteger(quantity) || quantity<1 || quantity>1000000 ||
      !/^\d{1,10}(?:\.\d{1,2})?$/.test(poUnitCost.trim()) || cost<0) {
      setError("Complete the purchase order fields with a valid quantity and unit cost."); return;
    }
    await callRpc("create_purchase_order",{p_tenant_id:tenantId,p_supplier_id:poSupplier,p_reference:poReference.trim(),p_notes:"",p_items:[{variant_id:poVariant,quantity,unit_cost_minor:Math.round(cost*100)}]},"Purchase order created as draft.");
    setPoReference("");
  }
  async function receivePoLine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const item=purchaseItems.find(line=>line.id===receiveItem && line.purchase_order_id===receiveOrder);
    const quantity=Number(receiveQuantity);
    if (!item || !receiveLocation || !receiveReference.trim() || !Number.isInteger(quantity) || quantity<1 || quantity>item.quantity_ordered-item.quantity_received) {
      setError("Choose a valid outstanding purchase line, location and quantity."); return;
    }
    const ok=await callRpc("receive_purchase_order_line",{p_tenant_id:tenantId,p_purchase_order_id:receiveOrder,p_purchase_order_item_id:item.id,p_location_id:receiveLocation,p_quantity:quantity,p_receipt_reference:receiveReference.trim(),p_idempotency_key:crypto.randomUUID(),p_notes:""},"Goods received. Stock and the movement ledger were updated together.");
    if(ok) {setReceiveReference("");setReceiveQuantity("1");}
  }

  return <div className="erp-manager">
    {(error || message) && <div className={error ? "form-message error" : "form-message"} role={error ? "alert" : "status"}>{error || message}</div>}
    <section className="erp-section">
      <div className="erp-section-heading"><div><p className="eyebrow">CUSTOMER DIRECTORY</p><h2>Customers</h2></div><span className="workspace-status">{customers.length}</span></div>
      {customers.length>0 && <div className="erp-record-list">{customers.slice(0,30).map(customer=><div key={customer.id}><strong>{customer.display_name}</strong><small>{customer.phone || customer.email || "No contact details"}</small></div>)}</div>}
      {canCustomers && <form className="product-form" onSubmit={addCustomer}>
        <h3>Add customer</h3><label>Name</label><input required maxLength={180} value={customerName} onChange={e=>setCustomerName(e.target.value)}/>
        <label>Phone</label><input maxLength={40} value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)}/>
        <label>Email</label><input type="email" maxLength={320} value={customerEmail} onChange={e=>setCustomerEmail(e.target.value)}/>
        <button className="primary-button" disabled={busy}>Save customer</button>
      </form>}
    </section>
    <section className="erp-section">
      <div className="erp-section-heading"><div><p className="eyebrow">SUPPLIER DIRECTORY</p><h2>Suppliers</h2></div><span className="workspace-status">{suppliers.length}</span></div>
      {suppliers.length>0 && <div className="erp-record-list">{suppliers.map(supplier=><div key={supplier.id}><strong>{supplier.name}</strong><small>{supplier.phone || supplier.email || "No contact details"}{supplier.active ? "" : " · inactive"}</small></div>)}</div>}
      {canSuppliers && <form className="product-form" onSubmit={addSupplier}>
        <h3>Add supplier</h3><label>Name</label><input required maxLength={180} value={supplierName} onChange={e=>setSupplierName(e.target.value)}/>
        <label>Phone</label><input maxLength={40} value={supplierPhone} onChange={e=>setSupplierPhone(e.target.value)}/>
        <label>Email</label><input type="email" maxLength={320} value={supplierEmail} onChange={e=>setSupplierEmail(e.target.value)}/>
        <button className="primary-button" disabled={busy}>Save supplier</button>
      </form>}
    </section>
    <section className="erp-section">
      <div className="erp-section-heading"><div><p className="eyebrow">PURCHASING</p><h2>Purchase orders</h2></div><span className="workspace-status">{purchaseOrders.length}</span></div>
      <div className="erp-record-list">{purchaseOrders.map(po=><div key={po.id}><strong>{po.reference}</strong><small>{suppliers.find(s=>s.id===po.supplier_id)?.name ?? "Supplier"} · {po.status.replaceAll("_"," ")}</small>
        {canPurchasing && po.status==="draft" && <button className="secondary-button" type="button" disabled={busy} onClick={()=>void callRpc("transition_purchase_order",{p_tenant_id:tenantId,p_purchase_order_id:po.id,p_status:"submitted"},"Purchase order submitted.")}>Submit</button>}
      </div>)}</div>
      {canPurchasing && <form className="product-form" onSubmit={createPo}>
        <h3>Create purchase order</h3>
        <label>Supplier</label><select required value={poSupplier} onChange={e=>setPoSupplier(e.target.value)}><option value="">Choose supplier</option>{suppliers.filter(s=>s.active).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <label>Reference</label><input required maxLength={80} value={poReference} onChange={e=>setPoReference(e.target.value)} placeholder="e.g. PO-2026-001"/>
        <label>Product variant</label><select required value={poVariant} onChange={e=>setPoVariant(e.target.value)}><option value="">Choose variant</option>{variants.filter(v=>v.status!=="archived").map(v=><option key={v.id} value={v.id}>{variantLabel(v.id)}</option>)}</select>
        <label>Quantity ordered</label><input required type="number" min="1" max="1000000" value={poQuantity} onChange={e=>setPoQuantity(e.target.value)}/>
        <label>Unit cost (KES)</label><input required inputMode="decimal" value={poUnitCost} onChange={e=>setPoUnitCost(e.target.value)}/>
        <button className="primary-button" disabled={busy || suppliers.filter(s=>s.active).length===0 || variants.filter(v=>v.status!=="archived").length===0}>Create draft PO</button>
        <p className="field-help">This form creates one product line per purchase order. Submit the PO before receiving stock.</p>
      </form>}
      {canPurchasing && <form className="product-form" onSubmit={receivePoLine}>
        <h3>Receive goods</h3>
        <label>Submitted purchase order</label><select required value={receiveOrder} onChange={e=>{setReceiveOrder(e.target.value);setReceiveItem("");}}><option value="">Choose purchase order</option>{purchaseOrders.filter(po=>["submitted","partially_received"].includes(po.status)).map(po=><option key={po.id} value={po.id}>{po.reference}</option>)}</select>
        <label>Purchase line</label><select required value={receiveItem} onChange={e=>setReceiveItem(e.target.value)}><option value="">Choose outstanding line</option>{purchaseItems.filter(item=>item.purchase_order_id===receiveOrder && item.quantity_received<item.quantity_ordered).map(item=><option key={item.id} value={item.id}>{variantLabel(item.variant_id)} · {item.quantity_ordered-item.quantity_received} remaining</option>)}</select>
        <label>Stock location</label><select required value={receiveLocation} onChange={e=>setReceiveLocation(e.target.value)}><option value="">Choose location</option>{locations.map(l=><option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}</select>
        <label>Quantity received</label><input required type="number" min="1" value={receiveQuantity} onChange={e=>setReceiveQuantity(e.target.value)}/>
        <label>Receipt reference</label><input required maxLength={80} value={receiveReference} onChange={e=>setReceiveReference(e.target.value)} placeholder="Delivery note / GRN reference"/>
        <button className="primary-button" disabled={busy || !receiveOrder || !receiveItem || !receiveLocation}>Post goods receipt</button>
      </form>}
    </section>
    <section className="erp-section">
      <div className="erp-section-heading"><div><p className="eyebrow">EXPENSE TRACKING</p><h2>Expenses</h2></div><span className="workspace-status">{expenses.length}</span></div>
      {expenses.length>0 && <div className="erp-record-list">{expenses.slice(0,50).map(expense=><div key={expense.id}><strong>{expense.description}</strong><small>{expense.category} · {expense.expense_date}{expense.reference ? ` · ${expense.reference}` : ""}</small><b>{new Intl.NumberFormat("en-KE",{style:"currency",currency:"KES"}).format(expense.amount_minor/100)}</b></div>)}</div>}
      {canFinance && <form className="product-form" onSubmit={addExpense}>
        <h3>Record expense</h3><label>Description</label><input required maxLength={240} value={expenseDescription} onChange={e=>setExpenseDescription(e.target.value)}/>
        <label>Category</label><input required maxLength={80} value={expenseCategory} onChange={e=>setExpenseCategory(e.target.value)}/>
        <label>Amount (KES)</label><input required inputMode="decimal" value={expenseAmount} onChange={e=>setExpenseAmount(e.target.value)}/>
        <label>Date</label><input required type="date" value={expenseDate} onChange={e=>setExpenseDate(e.target.value)}/>
        <label>Reference (optional)</label><input maxLength={120} value={expenseReference} onChange={e=>setExpenseReference(e.target.value)}/>
        <button className="primary-button" disabled={busy}>Record expense</button>
      </form>}
    </section>
  </div>;
}
