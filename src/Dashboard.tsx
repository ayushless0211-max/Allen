import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { CourseBatch } from './types';
import { Search, ChevronRight, BookOpen, Layers, Info, ShoppingCart } from 'lucide-react';

// Seeding high-quality default sample batches if Firebase is empty
export const SAMPLE_BATCHES: CourseBatch[] = [
  {
    id: "arjuna_physics_2026",
    name: "Apex Physics: JEE Main & Advanced",
    description: "An intensive masterclass covering Mechanics, Electromagnetism, Modern Physics and Thermodynamics with rigorous, mathematical derivations and problem-solving hacks.",
    price: 10,
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=600",
    highlights: ["120+ High-Definition Lectures", "Interactive JEE Main & Advanced Practice", "High-Yield Detailed Chapter Notes", "Gemini AI Quiz Builder Integrated"],
    subjects: [
      {
        id: "physics",
        name: "Physics",
        chapters: [
          {
            id: "electrostatics",
            name: "Electrostatics & Gauss Law",
            lectures: [
              { id: "p1", title: "L1: Coulomb's Law & Vector Form", videoUrl: "https://drive.google.com/file/d/1Bxx/view", duration: "45 mins" },
              { id: "p2", title: "L2: Electric Field due to Continuous Spheres", videoUrl: "https://drive.google.com/file/d/1Bxx/view", duration: "50 mins" }
            ],
            notes: [
              { id: "pn1", title: "Electrostatics Formulas & Standard Cases", content: "Key Electrostatics: F = qE, E = kQ/r^2. Flux = Q_enclosed / epsilon_0. Energy density = 1/2 * epsilon * E^2." }
            ],
            tests: [
              {
                id: "test1",
                title: "Electrostatics Level 1 Practice",
                questions: [
                  {
                    question: "Two point charges +4q and -q are placed on the x-axis at x = 0 and x = L respectively. At what point on the axis is the net electric field zero?",
                    options: ["x = L", "x = 2L", "x = 3L", "x = 4L"],
                    correctOption: 1,
                    explanation: "To find where E = 0, we solve: 4q / (4pi * e0 * x^2) = q / (4pi * e0 * (x-L)^2). Taking square root: 2/x = 1/|x-L|. Since the third point must be outside where fields oppose, we solve for x > L: 2(x-L) = x => 2x - 2L = x => x = 2L."
                  }
                ]
              }
            ],
            revision: [
              { id: "pr1", title: "Electrostatics Fast-Track Card", summary: "Force: F = kq1q2/r^2. Field of thin ring on-axis: kQx/(x^2+R^2)^1.5." }
            ]
          },
          {
            id: "kinematics",
            name: "Kinematics & Motion In 2D",
            lectures: [
              { id: "p3", title: "L1: Projectile Motion & Equation of Trajectory", videoUrl: "https://drive.google.com/file/d/1Bxx/view", duration: "60 mins" }
            ],
            notes: [
              { id: "pn2", title: "Projectile Formulas Sheet", content: "Trajectory Equation: y = x*tan(theta) - g*x^2 / (2*u^2*cos^2(theta)). Range R = u^2*sin(2*theta)/g." }
            ],
            tests: [],
            revision: []
          }
        ]
      }
    ],
    teachers: [
      { name: "H. C. Gupta", qualification: "IIT Kanpur Alumnus (8+ Years)" }
    ]
  },
  {
    id: "lakshya_chem_2026",
    name: "Lakshya Organic & Physical Chemistry",
    description: "Complete organic mechanisms (GOC, Nucleophilic substitutions, Carbonyl replacements) and physical chem modules (Chemical Equilibrium, Electrochemistry, Kinetics) for JEE.",
    price: 10,
    image: "https://images.unsplash.com/photo-1532187863486-abf9d39d66e8?auto=format&fit=crop&q=80&w=600",
    highlights: ["80+ Structured Topic Videos", "Mechanism-by-Mechanism Practice Sheets", "Aromatic Chemistry Notes", "Comprehensive JEE Prep Tests"],
    subjects: [
      {
        id: "chemistry",
        name: "Chemistry",
        chapters: [
          {
            id: "goc",
            name: "General Organic Chemistry (GOC)",
            lectures: [
              { id: "c1", title: "L1: Inductive Effect & Acidic Strength", videoUrl: "https://drive.google.com/file/d/1Bxx/view", duration: "48 mins" }
            ],
            notes: [
              { id: "cn1", title: "Electronic Displacement Summary", content: "Inductive effect is permanent distance-dependent displacement. Mesomeric effect involves complete conjugation of pi electrons." }
            ],
            tests: [
              {
                id: "ctest1",
                title: "Inductive & Acid-Base Strength Practice",
                questions: [
                  {
                    question: "Which of the following has the highest acidic strength?",
                    options: ["HCOOH", "CH3COOH", "ClCH2COOH", "FCH2COOH"],
                    correctOption: 3,
                    explanation: "Fluorine is highly electronegative and displays a strong -I effect, which stabilizes the carboxylate anion conjugate base more efficiently than Chlorine or alkyl groups."
                  }
                ]
              }
            ],
            revision: [
              { id: "cr1", title: "Aromaticity Rules & Checks", summary: "Huckel's Rule: Cyclic, Planar, Fully Conjugated Ring with (4n+2) pi-electrons." }
            ]
          }
        ]
      }
    ],
    teachers: [
      { name: "Dr. A. K. Verma", qualification: "M.Sc, Ph.D Organic Chemistry (12+ Years)" }
    ]
  },
  {
    id: "apex_math_2026",
    name: "Pratham Coordinate Geometry & Calculus",
    description: "Master differential and integral calculus, complex numbers, conic sections, and matrices tailored precisely for the latest JEE Mains & Advanced level syllabus.",
    price: 10,
    image: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=600",
    highlights: ["90+ Dynamic Video Lectures", "Highly Complex Advanced Conic Quizzes", "Chapter-by-Chapter Formulas", "AI Test Generator Tools"],
    subjects: [
      {
        id: "maths",
        name: "Mathematics",
        chapters: [
          {
            id: "limits",
            name: "Limits, Continuity & Differentiability",
            lectures: [
              { id: "m1", title: "L1: Standard Indeterminate Forms & L'Hopital", videoUrl: "https://drive.google.com/file/d/1Bxx/view", duration: "55 mins" }
            ],
            notes: [
              { id: "mn1", title: "Calculus Core Limits Sheet", content: "Limit x -> 0 (sin x / x) = 1. Limit x -> 0 (e^x - 1)/x = 1. Limit x -> infinity (1 + 1/x)^x = e." }
            ],
            tests: [
              {
                id: "mtest1",
                title: "Calculus limits & Derivatives Quiz",
                questions: [
                  {
                    question: "Evaluate Limit (x -> 0) [ (1 - cos 2x) / x^2 ]",
                    options: ["1/2", "1", "2", "4"],
                    correctOption: 2,
                    explanation: "1 - cos 2x = 2*sin^2(x). So, we evaluate Limit x->0 [ 2*sin^2(x) / x^2 ] = 2 * (Limit x->0 [ sin x / x ])^2 = 2 * 1 = 2."
                  }
                ]
              }
            ],
            revision: []
          }
        ]
      }
    ],
    teachers: [
      { name: "Prof. S. R. Raman", qualification: "Dual IIT MADRAS degree (10+ Years)" }
    ]
  }
];

export default function Dashboard() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();

  const [batches, setBatches] = useState<CourseBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  // Load from Firebase firestore "batches"
  useEffect(() => {
    const batchesCol = collection(db, 'batches');
    const unsubscribe = onSnapshot(batchesCol, (snapshot) => {
      if (!snapshot.empty) {
        const list: CourseBatch[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as CourseBatch);
        });
        setBatches(list);
      } else {
        // Fallback to beautiful seeded defaults when Firestore is empty
        setBatches(SAMPLE_BATCHES);
      }
      setLoading(false);
    }, (error) => {
      console.warn("Firestore collection empty or permission failed, running seeded defaults:", error);
      setBatches(SAMPLE_BATCHES);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter batches based on title/description and active subject tags
  const filteredBatches = batches.filter((batch) => {
    const nameStr = batch?.name || '';
    const descStr = batch?.description || '';
    const matchesSearch = 
      nameStr.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      descStr.toLowerCase().includes((searchQuery || '').toLowerCase());
    
    if (activeFilter === 'All') return matchesSearch;
    
    // Check if course has a subject satisfying the filter
    const matchesSubject = (batch?.subjects || []).some(sub => {
      const subId = sub?.id || '';
      const subName = sub?.name || '';
      return subId.toLowerCase() === (activeFilter || '').toLowerCase() ||
             subName.toLowerCase() === (activeFilter || '').toLowerCase();
    });
    
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-8 text-white w-full">
      
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Browse Courses</h1>
          {profile?.role === 'admin' && user?.email === 'ayushless0211@gmail.com' && (
            <span className="text-xs bg-white text-black font-semibold px-2 py-1 rounded-md">
              Admin Mode
            </span>
          )}
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text"
            placeholder="Search resources, courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-white/30 transition-colors text-white placeholder-zinc-500"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {['All', 'Physics', 'Chemistry', 'Maths'].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeFilter === filter 
                ? 'bg-white text-black' 
                : 'bg-white/5 text-zinc-400 border border-white/10 hover:text-white'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Course List Grid */}
      <div>
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4">
            <span className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-zinc-500 text-sm">Loading courses...</p>
          </div>
        ) : filteredBatches.length === 0 ? (
          <div className="py-24 text-center border border-white/10 rounded-2xl bg-white/[0.02]">
            <Layers className="w-8 h-8 mx-auto text-zinc-600 mb-4" />
            <p className="text-sm text-zinc-400">No matching courses found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBatches.map((batch) => {
              const isPurchased = profile?.hasLifetimeAccess || profile?.purchasedCourseIds?.includes(batch.id) ||
                (profile?.adAccess && profile.adAccess[batch.id] && profile.adAccess[batch.id] > Date.now());
              
              return (
                <div 
                  key={batch.id}
                  className="group/card relative aspect-[5/4] sm:aspect-[4/3] rounded-[2rem] overflow-hidden border border-white/5 bg-zinc-950 shadow-2xl transition-all duration-300"
                >
                  {/* Course Background Image */}
                  <img 
                    src={batch.image || "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=600"} 
                    alt={batch.name}
                    className="absolute inset-0 w-full h-full object-cover grayscale opacity-30 group-hover/card:opacity-40 group-hover/card:scale-105 transition-all duration-500"
                  />
                  
                  {/* Dark Radial and Linear Gradient Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/65 to-transparent" />
                  
                  {/* Top-Left Price Badge */}
                  <div className="absolute top-5 left-5 bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-zinc-300 font-sans">
                    ₹10
                  </div>

                  {/* Top-Right Round Button: Details / Info ("i") */}
                  <div className="absolute top-5 right-5 z-10">
                    <button
                      id={`info-btn-${batch.id}`}
                      title="View details"
                      onClick={() => navigate(`/batch/${batch.id}`)}
                      className="w-12 h-12 rounded-full flex items-center justify-center bg-black/40 hover:bg-white hover:text-black border border-white/10 hover:border-white text-white transition-all duration-300 backdrop-blur-md cursor-pointer hover:scale-110 shadow-lg"
                    >
                      <Info className="w-5 h-5 pointer-events-none" />
                    </button>
                  </div>

                  {/* Bottom Elements */}
                  <div className="absolute bottom-0 inset-x-0 p-6 flex items-end justify-between gap-4 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent pt-12">
                    {/* Bottom-Left: Title and Small Description */}
                    <div className="space-y-1.5 text-left md:max-w-[70%]">
                      <h3 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight group-hover/card:text-neutral-200 transition-colors">
                        {batch.name}
                      </h3>
                      <p className="text-xs text-zinc-400 font-sans leading-relaxed line-clamp-2">
                        {batch.description}
                      </p>
                    </div>

                    {/* Bottom-Right: Interactive Action Button */}
                    <div className="shrink-0">
                      {isPurchased ? (
                        /* Purchased: Classroom Button (Go to Classroom) */
                        <button
                          id={`classroom-btn-${batch.id}`}
                          title="Open Classroom"
                          onClick={() => navigate(`/batch/${batch.id}`)}
                          className="w-12 h-12 rounded-full flex items-center justify-center bg-white/15 hover:bg-white text-white hover:text-black border border-white/20 hover:border-white transition-all duration-300 shadow-xl cursor-pointer hover:scale-110 backdrop-blur-md"
                        >
                          <BookOpen className="w-5 h-5 pointer-events-none" />
                        </button>
                      ) : (
                        /* Not Purchased: Add to Cart / Purchase Button */
                        <button
                          id={`cart-btn-${batch.id}`}
                          title="Add to Cart / Purchase"
                          onClick={() => navigate(`/batch/${batch.id}`)}
                          className="w-12 h-12 rounded-full flex items-center justify-center bg-white text-black hover:bg-neutral-200 border border-transparent transition-all duration-300 shadow-xl cursor-pointer hover:scale-110"
                        >
                          <ShoppingCart className="w-5 h-5 pointer-events-none" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

