"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BG_COLOR, BORDER_COLOR } from "@/lib/colors";

import { RiClaudeFill } from "react-icons/ri";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { MdCall, MdBolt } from "react-icons/md";
import { HiHome } from "react-icons/hi";
import { SidebarItemProps } from "@/lib/types";

import { SideBarOptions } from "@/data/sidebarOptions";
import { CiSearch } from "react-icons/ci";
import {
	TbTargetArrow,
	TbSettings2,
	TbInbox,
} from "react-icons/tb";
import { HiChevronDown, HiChevronUp } from "react-icons/hi";
import { useWebProvider } from "../context/WebContext";
import { useRouter } from "next/navigation";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { Button } from "@/components/ui/button";
import api from "@/lib/axiosConfig";
import toast from "react-hot-toast";

export default function FiltersSidebar() {
	const router: AppRouterInstance = useRouter();
	const { collapsed, setCollapsed, setActiveItem, activeItem, refreshFlag } = useWebProvider();
	const [handlingPayment, setHandlingPayment] = useState<boolean>(false);

	const toggleCollapsed = () => setCollapsed((prev) => !prev);
	const sidebarWidth = collapsed ? 72 : 288;

	const [openSectionId, setOpenSectionId] = useState<string | null>(
		SideBarOptions[0]?.id ?? null
	);

	const handleToggleSection = (id: string) => {
		setOpenSectionId((prev) => (prev === id ? null : id));
	};

	const [credits, setCredits] = useState<number | null>(null);
	const [loadingCredits, setLoadingCredits] = useState<boolean>(true);
	const [creditsError, setCreditsError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;

		const fetchMe = async () => {
			setLoadingCredits(true);
			setCreditsError(null);
			try {
				const res = await api.get("/auth/me");
				// Expecting server to return { success: true, data: user }
				const user = res?.data?.data;
				if (mounted) {
					if (user && typeof user.credits === "number") {
						setCredits(user.credits);
					} else {
						setCredits(null);
					}
				}
			} catch (err: any) {
				if (mounted) {
					setCredits(null);
					// try to extract a readable message
					const msg =
						err?.response?.data?.message ??
						err?.message ??
						"Failed to load user";
					setCreditsError(String(msg));
				}
			} finally {
				if (mounted) setLoadingCredits(false);
			}
		};

		fetchMe();

		return () => {
			mounted = false;
		};
	}, [refreshFlag]);

	
	const handlePayment = async (creditsToBuy: number = 100) => {
		setHandlingPayment(true);
		try {
			let userId: string | null = null;
			try {
				const meRes = await api.get("/auth/me");
				const user = meRes?.data?.data ?? meRes?.data;
				if (user && user._id) userId = String(user._id);
			} catch (meErr) {
				const winUser = typeof window !== "undefined" ? (window as any).currentUser : null;
				if (winUser?._id) userId = String(winUser._id);
				else {
					try {
						const raw = typeof window !== "undefined" ? localStorage.getItem("currentUser") : null;
						const parsed = raw ? JSON.parse(raw) : null;
						if (parsed?._id) userId = String(parsed._id);
					} catch { }
				}
			}

			if (!userId) {
				toast.error("Unable to determine current user. Please log in again.");
				return;
			}

			const credits = Number(creditsToBuy ?? 0);
			if (!credits || credits <= 0) {
				toast.error("Invalid credits amount");
				return;
			}

			const res = await api.post("/payments/checkout", {
				userId,
				credits,
			});

			const url = res?.data?.data?.url;
			if (!url) {
				toast.error(res?.data?.message ?? "Failed to start checkout");
				console.error("No session url returned:", res?.data);
				return;
			}

			try {
				localStorage.setItem("pending_checkout_session", JSON.stringify({ sessionId: res.data.data.id, credits }));
			} catch { }

			window.location.href = url;
		} catch (err: any) {
			console.error("Payment initiation error:", err);
			toast.error(err?.response?.data?.message ?? "Failed to initiate payment. Please try again.");
		} finally {
			setHandlingPayment(false);
		}
	};


	return (
		<motion.aside
			style={{
				backgroundColor: "rgba(255,255,255,0.92)", // shaded white
				borderRight: `1px solid ${BORDER_COLOR ?? "#e7e7ea"}`,
				backdropFilter: "saturate(120%)",
			}}
			animate={{ width: sidebarWidth }}
			initial={false}
			transition={{ type: "spring", stiffness: 260, damping: 30 }}
			className="fixed top-0 left-0 h-screen flex flex-col overflow-hidden"
		>
			{/* TOP */}
			<div className="px-3 py-3 w-full space-y-3 border-b" style={{ borderColor: BORDER_COLOR ?? "#e7e7ea" }}>
				<div className="flex items-center justify-between">
					{!collapsed && (
						<div className="h-9 w-9 rounded-xl bg-white/90 flex items-center justify-center">
							<RiClaudeFill className="text-[20px] text-gray-700" />
						</div>
					)}

					<button
						onClick={toggleCollapsed}
						className="inline-flex h-8 w-8 items-center justify-center rounded-full border bg-white text-gray-700"
						aria-label="Toggle sidebar"
					>
						{collapsed ? <FiChevronRight /> : <FiChevronLeft />}
					</button>
				</div>

				{collapsed && (
					<div className="h-9 w-9 rounded-xl bg-white/90 flex items-center justify-center mx-auto">
						<RiClaudeFill className="text-[20px] text-gray-700" />
					</div>
				)}

				{/* Home + Call */}
				{!collapsed && (
					<div className="flex items-center justify-between">
						<button className="flex items-center gap-2 rounded-lg py-2 px-2 cursor-pointer bg-white border text-gray-700">
							<HiHome className="text-[18px]" />
							<span className="text-xs font-medium">Home</span>
						</button>

						<button className="h-8 w-8 rounded-full bg-white border flex items-center justify-center text-gray-700">
							<MdCall />
						</button>
					</div>
				)}

				{collapsed && (
					<div className="flex items-center justify-center gap-3">
						<button className="h-8 w-8 rounded-full bg-white border flex items-center justify-center text-gray-700">
							<HiHome />
						</button>
						<button className="h-8 w-8 rounded-full bg-white border flex items-center justify-center text-gray-700">
							<MdCall />
						</button>
					</div>
				)}
			</div>

			{/* NAV */}
			<div className="flex-1 overflow-y-auto px-2 pb-3 pt-4">
				{!collapsed && (
					<p className="text-[11px] uppercase tracking-wider text-gray-500 px-2 mb-2">Navigation</p>
				)}

				<div className="space-y-1">
					{SideBarOptions.map((section) => {
						const isOpen = openSectionId === section.id;
						const isSectionActive = section.subMenu.includes(activeItem);

						let IconComp: React.ReactNode = <CiSearch className="text-[16px] text-gray-600" />;
						if (section.id === "Engage") IconComp = <MdBolt className="text-[16px] text-gray-600" />;
						if (section.id === "Win Deals") IconComp = <TbTargetArrow className="text-[16px] text-gray-600" />;
						if (section.id === "Tools and Automation") IconComp = <TbSettings2 className="text-[16px] text-gray-600" />;
						if (section.id === "Inbound") IconComp = <TbInbox className="text-[16px] text-gray-600" />;

						return (
							<div key={section.id} className="rounded-md">
								{/* Parent row */}
								<button
									onClick={() => handleToggleSection(section.id)}
									className={[
										"flex w-full items-center py-2 px-2 rounded-lg transition-colors",
										collapsed ? "justify-center" : "justify-between",
										isSectionActive ? "bg-white border-l-4 border-indigo-500" : "hover:bg-white/60",
									].join(" ")}
								>
									<div className={`flex items-center ${collapsed ? "justify-center" : "gap-2"}`}>
										<span className={`flex h-7 w-7 items-center justify-center rounded-md ${isSectionActive ? "bg-indigo-50" : "bg-transparent"}`}>
											{IconComp}
										</span>
										{!collapsed && <span className="text-[13px] font-medium text-gray-800">{section.name}</span>}
									</div>

									{!collapsed && (
										<span className="ml-2 text-gray-500">
											{isOpen ? <HiChevronUp /> : <HiChevronDown />}
										</span>
									)}
								</button>

								{/* Submenu */}
								{!collapsed && isOpen && (
									<ul className="mt-1 mb-2 space-y-[2px] pl-5">
										{section.subMenu.map((item) => {
											const isActive = item === activeItem;
											return (
												<li key={item} className="relative">
													{isActive && (
														<span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] bg-indigo-500 rounded-full" />
													)}

													<button
														onClick={() => { setActiveItem(item); router.push(`/${item.toLowerCase()}`); }}
														className={[
															"w-full text-left text-[13px] cursor-pointer rounded-md py-1.5 px-3 transition-colors",
															isActive
																? "bg-indigo-50 text-indigo-700 font-medium"
																: "text-gray-700 hover:bg-gray-100"
														].join(" ")}
													>
														{item}
													</button>
												</li>
											);
										})}
									</ul>
								)}

							</div>
						);
					})}
				</div>
			</div>

			{/* CREDITS CARD - dynamic */}
			<div
				className="px-3 py-3 border-t mb-20"
				style={{ borderColor: BORDER_COLOR ?? "#e7e7ea", background: "white" }}
			>
				<div
					className={[
						"w-full rounded-lg p-3 shadow-sm",
						// Use column layout so button sits at the bottom; when collapsed keep centered
						"flex flex-col gap-2",
						collapsed ? "items-center" : "items-start",
					].join(" ")}
					style={{ backgroundColor: "rgba(255,255,255,0.95)", minHeight: 84 }}
				>
					{/* Top: icon + label */}
					<div className="flex items-center gap-3 w-full">
						<div className="h-9 w-9 rounded-md bg-indigo-50 flex items-center justify-center">
							<svg
								className="h-5 w-5 text-indigo-600"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={1.5}
							>
								<path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 1.567-3 3.5S10.343 15 12 15s3-1.567 3-3.5S13.657 8 12 8z" />
								<path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414m12.728 0l-1.414-1.414M7.05 7.05 5.636 5.636" />
							</svg>
						</div>

						{!collapsed ? (
							<div>
								<p className="text-[13px] font-medium text-gray-800">Credits</p>
								<p className="text-sm font-semibold text-gray-900">
									{loadingCredits ? "..." : credits !== null ? credits : "--"}
								</p>
								{creditsError && (
									<p className="text-[11px] text-rose-600 mt-1">Unable to load</p>
								)}
							</div>
						) : (
							<div className="text-center w-full">
								<p className="text-[12px] font-medium text-gray-800">{loadingCredits ? "..." : credits !== null ? credits : "--"}</p>
							</div>
						)}
					</div>

					{/* Spacer pushes button to bottom */}
					<div className="flex-1" />

					{/* Bottom: Upgrade button (anchored to bottom) */}
					<div className="w-full">
						<Button
							disabled={handlingPayment}
							onClick={() => handlePayment(100)}
							className={[
								"w-full cursor-pointer text-black inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium",
								"border bg-yellow-500 hover:bg-yellow-400",
								// keep compact when collapsed
								collapsed ? "px-2 py-1 text-xs" : "",
							].join(" ")}
							aria-label="Upgrade credits"
						>
							{!collapsed && !handlingPayment ? "Buy 100 credits" : ""}
							{handlingPayment && "Buying..."}
						</Button>
					</div>
				</div>
			</div>

		</motion.aside>
	);
}

function SidebarItem({ collapsed, icon, label }: SidebarItemProps) {
	return (
		<button
			className={`flex cursor-pointer w-full items-center rounded-md px-2 py-2 hover:bg-[#48474a] text-slate-200 transition-colors ${collapsed ? "justify-center" : "justify-start gap-2"
				}`}
		>
			<span className="flex h-6 w-6 items-center justify-center">
				{icon}
			</span>
			{!collapsed && (
				<span className="text-[13px] opacity-80">{label}</span>
			)}
		</button>
	);
}
