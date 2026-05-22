import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { completeOnboarding } from '../features/auth/authSlice';
import { BrandLogo, Button, Input, Select } from '../components/ui/index';

const STEPS = ['Profile', 'Income', 'Strategy', 'Done'];

const STRATEGIES = [
  { name: '50-30-20', desc: 'Needs · Wants · Savings', divisions: [{label:'Needs',percentage:50,color:'#00E5A0'},{label:'Wants',percentage:30,color:'#7B6EF6'},{label:'Savings',percentage:20,color:'#F7931A'}] },
  { name: '60-20-20', desc: 'Needs · Savings · Wants', divisions: [{label:'Needs',percentage:60,color:'#00E5A0'},{label:'Savings',percentage:20,color:'#F7931A'},{label:'Wants',percentage:20,color:'#7B6EF6'}] },
  { name: '70-20-10', desc: 'Needs · Savings · Invest', divisions: [{label:'Needs',percentage:70,color:'#00E5A0'},{label:'Savings',percentage:20,color:'#F7931A'},{label:'Investments',percentage:10,color:'#3E8EFF'}] },
];

export default function Onboarding() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading } = useSelector((s) => s.auth);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    age: '', occupation: '', currency: 'INR', riskAppetite: 'medium',
    monthlyGrossIncome: '', monthlyFixedIncome: '', sideIncome: '',
    monthlyRent: '', existingLoans: '', financialGoalType: '', savingsGoal: '',
    strategyName: '50-30-20',
    divisions: STRATEGIES[0].divisions,
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleFinish = async () => {
    const res = await dispatch(completeOnboarding({ ...form }));
    if (completeOnboarding.fulfilled.match(res)) navigate('/');
  };

  const slideVariants = {
    enter: { x: 60, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -60, opacity: 0 },
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo + step indicator */}
        <div className="text-center mb-8">
          <BrandLogo className="mx-auto mb-4" />
          <h1 className="font-display font-bold text-2xl mb-4">Set up your profile</h1>
          <div className="flex items-center justify-center gap-2">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i <= step ? 'bg-accent-green text-black' : 'bg-bg-tertiary text-text-muted'}`}>
                  {i < step ? '✓' : i + 1}
                </div>
                {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? 'bg-accent-green' : 'bg-bg-tertiary'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          <AnimatePresence mode="wait">
            {/* Step 0: Profile */}
            {step === 0 && (
              <motion.div key="s0" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-4">
                <h2 className="font-display font-semibold text-lg mb-4">Personal details</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label="Age" type="number" value={form.age} onChange={(e) => set('age', e.target.value)} placeholder="25" />
                  <Select label="Risk Appetite" value={form.riskAppetite} onChange={(e) => set('riskAppetite', e.target.value)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </Select>
                </div>
                <Input label="Occupation" value={form.occupation} onChange={(e) => set('occupation', e.target.value)} placeholder="Software Engineer" />
                <Select label="Currency" value={form.currency} onChange={(e) => set('currency', e.target.value)}>
                  <option value="INR">₹ Indian Rupee (INR)</option>
                  <option value="USD">$ US Dollar (USD)</option>
                  <option value="EUR">€ Euro (EUR)</option>
                  <option value="GBP">£ British Pound (GBP)</option>
                </Select>
                <Select label="Primary Financial Goal" value={form.financialGoalType} onChange={(e) => set('financialGoalType', e.target.value)}>
                  <option value="">Select a goal</option>
                  <option value="save_emergency">Build emergency fund</option>
                  <option value="buy_house">Buy a house</option>
                  <option value="pay_debt">Pay off debt</option>
                  <option value="invest">Grow investments</option>
                  <option value="retire_early">Retire early</option>
                </Select>
                <Button onClick={() => setStep(1)} className="w-full justify-center mt-2">Continue →</Button>
              </motion.div>
            )}

            {/* Step 1: Income */}
            {step === 1 && (
              <motion.div key="s1" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-4">
                <h2 className="font-display font-semibold text-lg mb-4">Income & expenses</h2>
                <Input label="Monthly Gross Income (₹)" type="number" value={form.monthlyGrossIncome} onChange={(e) => set('monthlyGrossIncome', e.target.value)} placeholder="85000" />
                <Input label="Monthly Fixed Income (₹)" type="number" value={form.monthlyFixedIncome} onChange={(e) => set('monthlyFixedIncome', e.target.value)} placeholder="75000" />
                <Input label="Side/Freelance Income (₹)" type="number" value={form.sideIncome} onChange={(e) => set('sideIncome', e.target.value)} placeholder="12000" />
                <Input label="Monthly Rent (₹)" type="number" value={form.monthlyRent} onChange={(e) => set('monthlyRent', e.target.value)} placeholder="18000" />
                <Input label="Existing Loan EMIs (₹)" type="number" value={form.existingLoans} onChange={(e) => set('existingLoans', e.target.value)} placeholder="0" />
                <Input label="Monthly Savings Goal (₹)" type="number" value={form.savingsGoal} onChange={(e) => set('savingsGoal', e.target.value)} placeholder="17000" />
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setStep(0)} className="flex-1 justify-center">← Back</Button>
                  <Button onClick={() => setStep(2)} className="flex-1 justify-center">Continue →</Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Strategy */}
            {step === 2 && (
              <motion.div key="s2" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>
                <h2 className="font-display font-semibold text-lg mb-4">Choose your strategy</h2>
                <div className="space-y-3 mb-6">
                  {STRATEGIES.map((s) => (
                    <div
                      key={s.name}
                      onClick={() => { set('strategyName', s.name); set('divisions', s.divisions); }}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${form.strategyName === s.name ? 'border-accent-green/40 bg-accent-green/5' : 'border-white/[0.07] hover:border-white/15'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-display font-semibold">{s.name}</span>
                        {form.strategyName === s.name && <span className="text-accent-green text-sm">✓ Selected</span>}
                      </div>
                      <p className="text-xs text-text-secondary mb-3">{s.desc}</p>
                      <div className="flex gap-1 h-2">
                        {s.divisions.map((d) => (
                          <div key={d.label} className="rounded-full" style={{ flex: d.percentage, background: d.color }} title={`${d.label}: ${d.percentage}%`} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setStep(1)} className="flex-1 justify-center">← Back</Button>
                  <Button onClick={() => setStep(3)} className="flex-1 justify-center">Continue →</Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Done */}
            {step === 3 && (
              <motion.div key="s3" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="text-center py-4">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="font-display font-bold text-2xl mb-2">You're all set!</h2>
                <p className="text-text-secondary text-sm mb-2">
                  Strategy: <span className="text-accent-green font-semibold">{form.strategyName}</span>
                </p>
                {form.monthlyGrossIncome && (
                  <p className="text-text-secondary text-sm mb-6">
                    Income: <span className="text-text-primary font-semibold">₹{Number(form.monthlyGrossIncome).toLocaleString('en-IN')}/month</span>
                  </p>
                )}
                <div className="bg-bg-tertiary rounded-xl p-4 mb-6 text-left space-y-2">
                  {form.divisions.map((d) => (
                    <div key={d.label} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                        <span className="text-text-secondary">{d.label}</span>
                      </div>
                      <span className="font-semibold">{d.percentage}% · ₹{Math.round((d.percentage / 100) * (Number(form.monthlyGrossIncome) + Number(form.sideIncome || 0))).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
                <Button onClick={handleFinish} loading={isLoading} className="w-full justify-center">
                  Launch Dashboard 🚀
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
