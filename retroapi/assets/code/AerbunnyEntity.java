package com.example.example_mod;

import com.periut.retroapi.entity.spawn.RetroMobSpawnData;

import net.minecraft.block.Block;
import net.minecraft.entity.LivingEntity;
import net.minecraft.util.math.MathHelper;
import net.minecraft.world.World;

import net.ornithemc.osl.core.api.util.NamespacedIdentifier;


/**
 * The Aerbunny, a self-contained reimplementation of the floaty puffball from
 * aether-fabric-b1.7.3 (https://github.com/matthewperiut/aether-fabric-b1.7.3). The
 * original is a full breeding/riding AI mob; this keeps the part that teaches the
 * lesson, COMMUNICATING RENDER STATE FROM SERVER TO CLIENT, and drops the rest.
 *
 * The rendering problem: a bunny puffs up and tilts as it floats, but those visuals
 * depend on its vertical velocity and a "puffiness" timer that only the SERVER
 * simulates. A client only receives position updates, not velocity or puffiness, so
 * if the renderer read its own local fields the puff would never show in multiplayer.
 *
 * The fix is the DataTracker: a per-entity key/value table the server syncs to every
 * watching client automatically. We publish two synced values here, velocityY (slot
 * 18) and puffiness (slot 17), and the renderer reads THOSE, not the raw fields. That
 * is the whole client/server render-state handshake, see AerbunnyModel (puffiness
 * scales the puff cube) and AerbunnyRenderer (velocityY drives the tilt).
 *
 * Floats do not fit a DataTracker int directly, so they ride as raw bits via
 * Float.floatToIntBits / intBitsToFloat, a common beta-era trick.
 */
public class AerbunnyEntity extends LivingEntity implements RetroMobSpawnData {

	public static final NamespacedIdentifier ID = ExampleMod.id("aerbunny");

	/** DataTracker slots. 16 is reserved by LivingEntity, so modded slots start at 17. */
	private static final int PUFFINESS_SLOT = 17;
	private static final int VELOCITY_Y_SLOT = 18;

	/** Local (server-authoritative) puffiness, 0..~1.15, decays each tick. */
	public float puffiness;

	public AerbunnyEntity(World world) {
		super(world);
		this.texture = "/assets/example_mod/textures/mobs/aerbunny.png";
		// Match the model's footprint so it sits ON the ground, not hovering above it.
		this.setBoundingBoxSpacing(0.4F, 0.4F);
		this.standingEyeHeight = -0.16F;
		this.health = 6;
		// Render far: a floaty mob is easy to lose track of up close.
		if (this.renderDistanceMultiplier < 5.0) {
			this.renderDistanceMultiplier = 5.0;
		}
	}

	@Override
	protected void initDataTracker() {
		super.initDataTracker();
		this.dataTracker.startTracking(PUFFINESS_SLOT, 0); // float bits
		this.dataTracker.startTracking(VELOCITY_Y_SLOT, 0); // float bits
	}

	@Override
	public void tick() {
		if (!this.world.isRemote) {
			// SERVER: float gently (cancel most of gravity), puff when descending, then
			// publish the render state. Clients never run this branch.
			if (this.velocityY < -0.1) {
				this.velocityY = -0.1; // terminal-velocity float, like a slow parachute
			}
			if (this.velocityY < -0.04 && this.puffiness <= 0.0F) {
				this.puffiness = 1.0F; // puff on the way down
			}
			this.puffiness = Math.max(0.0F, this.puffiness - 0.08F);

			this.dataTracker.set(PUFFINESS_SLOT, Float.floatToIntBits(this.puffiness));
			this.dataTracker.set(VELOCITY_Y_SLOT, Float.floatToIntBits((float) this.velocityY));
		} else {
			// CLIENT: trust the synced value, with a small local decay so the puff eases
			// out smoothly between the (infrequent) tracker updates.
			float synced = Float.intBitsToFloat(this.dataTracker.getInt(PUFFINESS_SLOT));
			this.puffiness = synced > this.puffiness ? synced : Math.max(0.0F, this.puffiness - 0.08F);
		}
		super.tick();
	}

	/** The synced vertical velocity the renderer tilts by (client reads the tracker). */
	public float getSyncedVelocityY() {
		return Float.intBitsToFloat(this.dataTracker.getInt(VELOCITY_Y_SLOT));
	}

	@Override
	protected boolean canDespawn() {
		return false;
	}

	/**
	 * Natural-spawn gate: only in the Noisy dimension and only on grass. We do NOT count
	 * the population here, the overall "how many of this kind can exist" cap is RetroAPI's
	 * job (it teaches beta's spawn cap about modded mobs, see RetroSpawnGroups), so a
	 * custom mob does not have to reinvent it. This method is just the placement rule.
	 */
	@Override
	public boolean canSpawn() {
		if (ExampleMod.NOISY_DIMENSION == null
				|| this.world.dimension.id != ExampleMod.NOISY_DIMENSION.getSerialId()) {
			return false;
		}
		int bx = MathHelper.floor(this.x);
		int by = MathHelper.floor(this.boundingBox.minY);
		int bz = MathHelper.floor(this.z);
		return this.world.getBlockId(bx, by - 1, bz) == Block.GRASS_BLOCK.id && super.canSpawn();
	}

	@Override
	protected String getHurtSound() {
		// Subfolder + variant sounds: files at sounds/sound/mobs/aerbunny/aerbunnyhurt1.ogg
		// and aerbunnyhurt2.ogg collapse to one event id, and the engine picks one at
		// random. The autoloader handles the nesting and the digit collapse for free.
		return "example_mod:mobs.aerbunny.aerbunnyhurt";
	}

	@Override
	protected String getDeathSound() {
		return "example_mod:mobs.aerbunny.aerbunnydeath";
	}

	@Override
	public NamespacedIdentifier getHandlerId() {
		return ID;
	}
}
